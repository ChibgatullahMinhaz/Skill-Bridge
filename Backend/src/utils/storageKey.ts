export const createCategoryStorageKey = (
  file: Express.Multer.File,
  slug: string,
): string => {
  const extension = file.originalname.split(".").pop() || "png";
  return `categories/${Date.now()}-${slug}.${extension}`;
};

export const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};
