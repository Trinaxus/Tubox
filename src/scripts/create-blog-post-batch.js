#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Constants
const BLOG_FS_PATH = path.join(process.cwd(), 'public', 'uploads', 'blog');
const INDEX_PATH = path.join(BLOG_FS_PATH, 'index.json');

// Utility functions
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/&/g, '-and-')      // Replace & with 'and'
    .replace(/[^\w\-]+/g, '')     // Remove all non-word characters
    .replace(/\-\-+/g, '-')       // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '');         // Trim - from end of text
}

// Function to read and parse the index file
async function readIndexFile() {
  try {
    if (!fs.existsSync(INDEX_PATH)) {
      console.log('Index file does not exist. Creating a new one.');
      return { posts: [] };
    }
    
    const indexContent = fs.readFileSync(INDEX_PATH, 'utf-8');
    return JSON.parse(indexContent);
  } catch (error) {
    console.error(`Error reading index file: ${error.message}`);
    return { posts: [] };
  }
}

// Function to write the index file
async function writeIndexFile(indexData) {
  try {
    fs.writeFileSync(INDEX_PATH, JSON.stringify(indexData, null, 2), 'utf-8');
    console.log('Index file updated successfully.');
  } catch (error) {
    console.error(`Error writing index file: ${error.message}`);
  }
}

// Function to create a blog post file
async function createBlogPostFile(post) {
  try {
    const filePath = path.join(BLOG_FS_PATH, `${post.slug}.json`);
    fs.writeFileSync(filePath, JSON.stringify(post, null, 2), 'utf-8');
    console.log(`Blog post file created: ${post.slug}.json`);
    return true;
  } catch (error) {
    console.error(`Error creating blog post file: ${error.message}`);
    return false;
  }
}

// Function to add a post to the index
function addPostToIndex(indexData, post) {
  // Check if post already exists in index
  const existingPostIndex = indexData.posts.findIndex(p => p.slug === post.slug);
  
  // Create index entry
  const indexEntry = {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    author: post.author,
    category: post.category,
    tags: post.tags.join(';'),
    isDraft: post.isDraft,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    publishedAt: post.publishedAt
  };
  
  if (existingPostIndex >= 0) {
    // Update existing post
    indexData.posts[existingPostIndex] = indexEntry;
  } else {
    // Add new post
    indexData.posts.push(indexEntry);
  }
  
  return indexData;
}

// Function to create a blog post with template
async function createBlogPost(template, replacements) {
  // Create a copy of the template
  const post = JSON.parse(JSON.stringify(template));
  
  // Apply replacements
  for (const [key, value] of Object.entries(replacements)) {
    if (key === 'title') {
      post.title = value;
      // Generate slug from title if not provided
      if (!replacements.slug) {
        post.slug = slugify(value);
      }
      // Use title for SEO title if not provided
      if (!replacements.seoTitle) {
        post.seoTitle = value;
      }
    } else {
      post[key] = value;
    }
  }
  
  // Set timestamps if not provided
  const now = new Date().toISOString();
  post.createdAt = post.createdAt || now;
  post.updatedAt = post.updatedAt || now;
  post.publishedAt = post.publishedAt || now;
  
  return post;
}

// Function to prompt for template values
async function promptForTemplateValues(template) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const ask = (question) => new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
  
  console.log('\nEnter template values (leave empty to use default):');
  
  const replacements = {};
  
  // Ask for title (required)
  let title;
  do {
    title = await ask('Title (required): ');
  } while (!title);
  replacements.title = title;
  
  // Ask for other fields
  const slug = await ask(`Slug (default: ${slugify(title)}): `);
  if (slug) replacements.slug = slug;
  
  const excerpt = await ask('Excerpt: ');
  if (excerpt) replacements.excerpt = excerpt;
  
  const content = await ask('Content (HTML supported): ');
  if (content) replacements.content = content;
  
  const coverImage = await ask('Cover Image URL: ');
  if (coverImage) replacements.coverImage = coverImage;
  
  const author = await ask(`Author (default: ${template.author || 'Admin'}): `);
  if (author) replacements.author = author;
  
  const category = await ask(`Category (default: ${template.category || 'Uncategorized'}): `);
  if (category) replacements.category = category;
  
  const tagsStr = await ask('Tags (semicolon separated): ');
  if (tagsStr) replacements.tags = tagsStr.split(';').map(tag => tag.trim());
  
  const isDraft = await ask('Is Draft? (1 for yes, 0 for no, default: 0): ');
  if (isDraft) replacements.isDraft = isDraft;
  
  const seoTitle = await ask(`SEO Title (default: same as title): `);
  if (seoTitle) replacements.seoTitle = seoTitle;
  
  const seoDescription = await ask('SEO Description: ');
  if (seoDescription) replacements.seoDescription = seoDescription;
  
  rl.close();
  return replacements;
}

// Function to ask for number of posts to create
async function promptForPostCount() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('How many blog posts do you want to create? ', (answer) => {
      rl.close();
      const count = parseInt(answer, 10);
      resolve(isNaN(count) ? 1 : count);
    });
  });
}

// Main execution
async function main() {
  console.log('Batch Blog Post Creator');
  console.log('======================');
  
  // Ensure blog directory exists
  if (!fs.existsSync(BLOG_FS_PATH)) {
    console.log(`Creating blog directory: ${BLOG_FS_PATH}`);
    fs.mkdirSync(BLOG_FS_PATH, { recursive: true });
  }
  
  // Define template
  const template = {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    coverImage: '',
    author: 'Admin',
    category: 'Uncategorized',
    tags: [],
    isDraft: '0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    seoTitle: '',
    seoDescription: ''
  };
  
  // Ask for number of posts to create
  const postCount = await promptForPostCount();
  
  // Read current index
  const indexData = await readIndexFile();
  
  // Create posts
  for (let i = 0; i < postCount; i++) {
    console.log(`\n--- Creating Blog Post ${i + 1}/${postCount} ---`);
    
    // Get template values
    const replacements = await promptForTemplateValues(template);
    
    // Create post
    const post = await createBlogPost(template, replacements);
    
    // Check if post with this slug already exists
    const postPath = path.join(BLOG_FS_PATH, `${post.slug}.json`);
    if (fs.existsSync(postPath)) {
      console.log(`Post with slug '${post.slug}' already exists. Updating...`);
    }
    
    // Create post file
    const success = await createBlogPostFile(post);
    if (success) {
      // Update index
      addPostToIndex(indexData, post);
    }
  }
  
  // Write updated index
  await writeIndexFile(indexData);
  
  console.log('\nBatch blog post creation completed!');
}

// Run the script
main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});