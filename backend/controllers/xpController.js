const db = require("../config/db");

// Add XP to a user
const addXpToUser = async (userId, xpToAdd) => {
  try {
    // Try updating existing XP row
    const result = await db.query(
      `UPDATE user_xp
       SET xp = xp + $1,
           last_updated = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [xpToAdd, userId]
    );

    // If no row exists, create a new one
    if (result.rowCount === 0) {
      await db.query(
        `INSERT INTO user_xp (user_id, xp)
         VALUES ($1, $2)`,
        [userId, xpToAdd]
      );
    }

    return true;
  } catch (err) {
    console.error("Error updating XP:", err.message);
    throw new Error("XP update failed");
  }
};

module.exports = { addXpToUser };
