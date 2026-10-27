export function serializeUser(user) {
  const document =
    typeof user.toObject === "function" ? user.toObject() : user;

  const safeUser = {
    id: String(document._id || document.id),
    name: document.name,
    email: document.email,
    dailyStudyHours: document.dailyStudyHours,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };

  if (document.educationLevel !== undefined) {
    safeUser.educationLevel = document.educationLevel;
  }

  if (document.examTarget !== undefined) {
    safeUser.examTarget = document.examTarget;
  }

  if (document.preferredStudyTime !== undefined) {
    safeUser.preferredStudyTime = document.preferredStudyTime;
  }

  return safeUser;
}
