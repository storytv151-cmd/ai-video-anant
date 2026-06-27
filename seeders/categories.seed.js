import TemplateCategoryModel from "../src/models/TemplateCategory.js";
import { isEmpty } from "./seederUtils.js";

const defaultCategories = [
  {
    title: "Trending",
    slug: "trending",
    description: "Most popular templates right now",
    sortOrder: 1,
    featured: true,
  },
  {
    title: "Anime",
    slug: "anime",
    description: "Anime style generations",
    sortOrder: 2,
    featured: true,
  },
  {
    title: "Birthday",
    slug: "birthday",
    description: "Celebrate with video messages",
    sortOrder: 3,
    featured: false,
  },
  {
    title: "Wedding",
    slug: "wedding",
    description: "Marriage and couple aesthetics",
    sortOrder: 4,
    featured: false,
  },
  {
    title: "Fashion",
    slug: "fashion",
    description: "Trends and style showcases",
    sortOrder: 5,
    featured: false,
  },
  {
    title: "Kids",
    slug: "kids",
    description: "Cute animations and elements for children",
    sortOrder: 6,
    featured: false,
  },
  {
    title: "Festival",
    slug: "festival",
    description: "Holiday greetings and celebratory visuals",
    sortOrder: 7,
    featured: true,
  },
  {
    title: "Business",
    slug: "business",
    description: "Corporate presentations and announcements",
    sortOrder: 8,
    featured: false,
  },
  {
    title: "Travel",
    slug: "travel",
    description: "Wanderlust landscapes and stories",
    sortOrder: 9,
    featured: false,
  },
  {
    title: "Social Media",
    slug: "social-media",
    description: "Shorts, reels, and story configurations",
    sortOrder: 10,
    featured: true,
  },
  {
    title: "AI Avatar",
    slug: "ai-avatar",
    description: "Digital twin and voice sync content",
    sortOrder: 11,
    featured: true,
  },
  {
    title: "Cinematic",
    slug: "cinematic",
    description: "Studio grade landscape frames",
    sortOrder: 12,
    featured: true,
  },
  {
    title: "Product Showcase",
    slug: "product-showcase",
    description: "Promotional mockups and videos",
    sortOrder: 13,
    featured: false,
  },
  {
    title: "Education",
    slug: "education",
    description: "Instructional templates and visual aids",
    sortOrder: 14,
    featured: false,
  },
  {
    title: "Marketing",
    slug: "marketing",
    description: "Ad campaigns and hooks",
    sortOrder: 15,
    featured: false,
  },
  {
    title: "Animals",
    slug: "animals",
    description: "Nature and wildlife generators",
    sortOrder: 16,
    featured: false,
  },
  {
    title: "Nature",
    slug: "nature",
    description: "Beautiful landscapes and scenery",
    sortOrder: 17,
    featured: false,
  },
  {
    title: "Food",
    slug: "food",
    description: "Tasty cooking and restaurant previews",
    sortOrder: 18,
    featured: false,
  },
  {
    title: "Sports",
    slug: "sports",
    description: "Action sequences and gym hooks",
    sortOrder: 19,
    featured: false,
  },
  {
    title: "Technology",
    slug: "technology",
    description: "Abstract neon grids and hardware",
    sortOrder: 20,
    featured: false,
  },
];

const seed = async (reseed = false) => {
  if (reseed) {
    await TemplateCategoryModel.deleteMany({});
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const defaultCat of defaultCategories) {
    const existing = await TemplateCategoryModel.findOne({
      slug: defaultCat.slug,
    });
    if (!existing) {
      await TemplateCategoryModel.create(defaultCat);
      createdCount++;
    } else {
      let updated = false;
      for (const [key, val] of Object.entries(defaultCat)) {
        if (isEmpty(existing[key])) {
          existing[key] = val;
          updated = true;
        }
      }
      if (updated) {
        await existing.save();
        updatedCount++;
      } else {
        skippedCount++;
      }
    }
  }

  return {
    status:
      createdCount > 0 ? "created" : updatedCount > 0 ? "updated" : "skipped",
    created: createdCount,
    updated: updatedCount,
    skipped: skippedCount,
  };
};

export default { seed };
