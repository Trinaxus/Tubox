"use client";
import previewBox from "../edit/previewBox.module.css";
import React from "react";

export default function PreviewBox({
  title,
  slug,
  excerpt,
  coverImage,
  author,
  tags,
  category,
  content,
  seoTitle,
  seoDescription,
  isDraft
}: {
  title: string,
  slug: string,
  excerpt: string,
  coverImage: string,
  author: string,
  tags: string,
  category: string,
  content: string,
  seoTitle: string,
  seoDescription: string,
  isDraft: boolean,
}) {
  return (
    <div className={previewBox.previewBox}>
      <div className={previewBox.previewHeader}>Vorschau</div>
      <div className={previewBox.previewTitle}>{title || <span style={{color:'#888'}}>Titel...</span>}</div>
      {coverImage && (
        <img src={coverImage} alt="Cover" className={previewBox.previewCover} />
      )}
      {excerpt && <div className={previewBox.previewExcerpt}>{excerpt}</div>}
      <div className={previewBox.previewContent}>{content || <span style={{color:'#666'}}>Inhalt...</span>}</div>
      <div className={previewBox.previewMeta}>Autor: <b>{author || <span style={{color:'#666'}}>–</span>}</b></div>
      <div className={previewBox.previewMeta}>Kategorie: <b>{category || <span style={{color:'#666'}}>–</span>}</b></div>
      <div className={previewBox.previewMeta}>Tags: <b>{tags || <span style={{color:'#666'}}>–</span>}</b></div>
      <div className={previewBox.previewSeo}>
        <b>SEO Title:</b> {seoTitle || <span style={{color:'#888'}}>–</span>}<br/>
        <b>SEO Description:</b> {seoDescription || <span style={{color:'#888'}}>–</span>}
      </div>
      {isDraft && <div className={previewBox.previewDraft}>Entwurf</div>}
    </div>
  );
}
