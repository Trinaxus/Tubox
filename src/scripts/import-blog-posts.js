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

// Function to parse CSV-like data
function parseCSVData(data) {
  const lines = data.split('\n').filter(line => line.trim() !== '');
  const headers = lines[0].split(',').map(header => header.trim());
  
  const posts = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(value => value.trim());
    if (values.length !== headers.length) {
      console.warn(`Skipping line ${i+1}: incorrect number of fields`);
      continue;
    }
    
    const post = {};
    headers.forEach((header, index) => {
      post[header] = values[index];
    });
    posts.push(post);
  }
  
  return posts;
}

// Function to process a single post
function processPost(postData) {
  // Ensure required fields
  if (!postData.title) {
    console.error('Post must have a title');
    return null;
  }
  
  // Generate slug if not provided
  const slug = postData.slug || slugify(postData.title);
  
  // Process tags
  let tags = [];
  if (postData.tags) {
    tags = postData.tags.split(';').map(tag => tag.trim());
  }
  
  // Create post object
  const post = {
    title: postData.title,
    slug: slug,
    excerpt: postData.excerpt || '',
    content: postData.content || '',
    coverImage: postData.coverImage || '',
    author: postData.author || 'Admin',
    category: postData.category || 'Uncategorized',
    tags: tags,
    isDraft: postData.isDraft === '1' ? '1' : '0',
    createdAt: postData.publishedAt || new Date().toISOString(),
    updatedAt: postData.updatedAt || new Date().toISOString(),
    publishedAt: postData.publishedAt || new Date().toISOString(),
    seoTitle: postData.seoTitle || postData.title,
    seoDescription: postData.seoDescription || postData.excerpt || ''
  };
  
  return post;
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

// Main function to import posts from a file
async function importPostsFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return;
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const postsData = parseCSVData(fileContent);
    
    console.log(`Found ${postsData.length} posts to import`);
    
    // Read current index
    const indexData = await readIndexFile();
    
    // Process each post
    let successCount = 0;
    for (const postData of postsData) {
      const post = processPost(postData);
      if (!post) continue;
      
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
        successCount++;
      }
    }
    
    // Write updated index
    await writeIndexFile(indexData);
    
    console.log(`Successfully imported ${successCount} out of ${postsData.length} posts`);
  } catch (error) {
    console.error(`Error importing posts: ${error.message}`);
  }
}

// Function to prompt for file path
function promptForFilePath() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('Enter the path to the CSV file containing blog posts: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Main execution
async function main() {
  console.log('Blog Post Importer');
  console.log('=================');
  
  // Ensure blog directory exists
  if (!fs.existsSync(BLOG_FS_PATH)) {
    console.log(`Creating blog directory: ${BLOG_FS_PATH}`);
    fs.mkdirSync(BLOG_FS_PATH, { recursive: true });
  }
  
  // Get file path from command line args or prompt
  let filePath = process.argv[2];
  if (!filePath) {
    filePath = await promptForFilePath();
  }
  
  await importPostsFromFile(filePath);
}

// Run the script
main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});