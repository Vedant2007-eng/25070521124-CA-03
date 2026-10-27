export function serializeSubject(subject) {
  const document = subject.toObject ? subject.toObject() : subject;

  return {
    id: String(document._id ?? document.id),
    name: document.name,
    description: document.description || "",
    color: document.color || "",
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
