const pool = require("../config/db");
const { addXpToUser } = require("./xpController");
// ---------- CREATE MATCH ----------
const createMatch = async (req, res) => {
  try {
    const { player1_id } = req.body;
    if (!player1_id)
      return res.status(400).json({ error: "player1_id is required" });

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create match
    const matchResult = await pool.query(
      `INSERT INTO game_matches (id, player1_id, room_code, status, started_at)
       VALUES (gen_random_uuid(), $1, $2, 'waiting', NOW())
       RETURNING *`,
      [player1_id, roomCode]
    );
    const match = matchResult.rows[0];

    // Pick 10 random quizzes
    const quizzes = await pool.query(
      `SELECT id FROM community_quizzes ORDER BY RANDOM() LIMIT 10`
    );

    // Save to game_match_quizzes
    const values = quizzes.rows
      .map((q) => `('${match.id}', '${q.id}')`)
      .join(",");
    await pool.query(
      `INSERT INTO game_match_quizzes (match_id, quiz_id) VALUES ${values}`
    );

    res.json({ message: "Match created", match });
  } catch (err) {
    console.error("Error creating match:", err);
    res.status(500).json({ error: "Server error creating match" });
  }
};

// ---------- JOIN MATCH ----------
const joinMatch = async (req, res) => {
  const { room_code } = req.body;
  const player2_id = req.user?.id; // get from session

  if (!room_code) {
    return res.status(400).json({ error: "room_code is required" });
  }

  try {
    const result = await pool.query(
      `UPDATE game_matches
       SET player2_id = $1, status = 'ready'
       WHERE room_code = $2
       RETURNING *`,
      [player2_id, room_code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Match not found" });
    }

    res.json({ message: "Joined match successfully", match: result.rows[0] });
  } catch (err) {
    console.error("Error joining match:", err);
    res.status(500).json({ error: "Server error while joining match" });
  }
};

// ---------- FETCH QUIZZES FOR MATCH ----------
const getQuestionsForMatch = async (req, res) => {
  try {
    const { roomCode } = req.params;

    // Get match
    const matchRes = await pool.query(
      `SELECT id FROM game_matches WHERE room_code = $1`,
      [roomCode]
    );
    if (!matchRes.rows.length)
      return res.status(404).json({ error: "Match not found" });

    const matchId = matchRes.rows[0].id;

    // Fetch saved questions for the match
    const questionsRes = await pool.query(
      `SELECT g.id AS match_quiz_id, q.id AS quiz_id, q.question, q.options
       FROM game_match_quizzes g
       JOIN community_quizzes q ON g.quiz_id = q.id
       WHERE g.match_id = $1`,
      [matchId]
    );

    res.json(questionsRes.rows);
  } catch (err) {
    console.error("Error fetching match questions:", err);
    res.status(500).json({ error: "Server error fetching match questions" });
  }
};

// ---------- SUBMIT ANSWER ----------
const submitAnswer = async (req, res) => {
  const { match_quiz_id, player, answer } = req.body; // player = 1 or 2
  if (!match_quiz_id || !player || !answer)
    return res
      .status(400)
      .json({ error: "match_quiz_id, player, and answer are required" });

  try {
    // Get correct answer
    const quizRes = await pool.query(
      `SELECT q.correct_answer
       FROM game_match_quizzes g
       JOIN community_quizzes q ON g.quiz_id = q.id
       WHERE g.id = $1`,
      [match_quiz_id]
    );

    if (quizRes.rows.length === 0)
      return res.status(404).json({ error: "Quiz not found" });

    const correctAnswer = quizRes.rows[0].correct_answer;
    const score =
      correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase()
        ? 1
        : 0;

    // Update player's answer & score
    const columnAnswer = player === 1 ? "player1_answer" : "player2_answer";
    const columnScore = player === 1 ? "player1_score" : "player2_score";

    await pool.query(
      `UPDATE game_match_quizzes
       SET ${columnAnswer} = $1, ${columnScore} = $2
       WHERE id = $3`,
      [answer, score, match_quiz_id]
    );

    res.json({
      message: "Answer submitted",
      correct: score === 1,
      correctAnswer,
    });
  } catch (err) {
    console.error("Error submitting answer:", err);
    res.status(500).json({ error: "Server error submitting answer" });
  }
};

// ---------- FINALIZE MATCH ----------
const finalizeMatch = async (req, res) => {
  const { room_code } = req.body;
  if (!room_code)
    return res.status(400).json({ error: "room_code is required" });

  try {
    const matchRes = await pool.query(
      `SELECT id, player1_id, player2_id FROM game_matches WHERE room_code = $1`,
      [room_code]
    );
    if (!matchRes.rows.length)
      return res.status(404).json({ error: "Match not found" });

    const matchId = matchRes.rows[0].id;
    const { player1_id, player2_id } = matchRes.rows[0];

    // Sum scores from game_match_quizzes
    const scoresRes = await pool.query(
      `SELECT
         SUM(player1_score) AS player1_total,
         SUM(player2_score) AS player2_total
       FROM game_match_quizzes
       WHERE match_id = $1`,
      [matchId]
    );

    const p1Total = parseInt(scoresRes.rows[0].player1_total || 0);
    const p2Total = parseInt(scoresRes.rows[0].player2_total || 0);

    // Determine winner
    let winner_id = null;
    let result = "draw";
    if (p1Total > p2Total) {
      winner_id = player1_id;
      result = "player1";
    } else if (p2Total > p1Total) {
      winner_id = player2_id;
      result = "player2";
    }

    // Award XP using the same helper as normal quizzes
    if (p1Total > 0) await addXpToUser(player1_id, p1Total * 10);
    if (p2Total > 0) await addXpToUser(player2_id, p2Total * 10);

    // Update match record
    await pool.query(
      `UPDATE game_matches SET winner_id = $1, status = 'completed', ended_at = NOW() WHERE id = $2`,
      [winner_id, matchId]
    );

    // Emit leaderboard update to all clients in this match
    const io = req.app.get("io");
    io.to(room_code).emit("match_completed", {
      player1_id,
      player2_id,
      player1_xp: p1Total * 10,
      player2_xp: p2Total * 10,
      player1_total: p1Total,
      player2_total: p2Total,
      winner_id,
      result,
    });

    res.json({
      match_id: matchId,
      player1_total: p1Total,
      player2_total: p2Total,
      winner_id,
      result,
      message: `Match completed. Player1 XP: ${p1Total * 10}, Player2 XP: ${
        p2Total * 10
      }`,
    });
  } catch (err) {
    console.error("Error finalizing match:", err);
    res.status(500).json({ error: "Server error finalizing match" });
  }
};

module.exports = {
  createMatch,
  joinMatch,
  getQuestionsForMatch,
  submitAnswer,
  finalizeMatch,
};
