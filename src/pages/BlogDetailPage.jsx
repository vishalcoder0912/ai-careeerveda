import {useEffect} from "react";
import {Navigate, useParams} from "react-router-dom";

import BlogArticle from "../components/BlogArticle";
import staticBlogPosts from "../data/blogPosts";
import {useDocumentTitle} from "../hooks/useDocumentTitle";
import {adaptBlogPost} from "../lib/contentAdapters";
import {applySeo} from "../lib/seoTags";
import {absoluteUrl, OG_IMAGE} from "../config/siteMeta";
import {composeTitle, blogMeta} from "../config/pageMeta";
import {articleSchema, breadcrumbSchema, useJsonLd} from "../lib/structuredData";
import "../components/page-shell.css";

// BlogPage is the index; this route is the durable per-article URL.
//
// Reads src/data/blogPosts.js and nothing else, so a click renders the article
// on the very next frame with no request to wait on and no loading state to
// show. The chunk itself is already warm by then — routeChunks prefetches it
// the moment a card is hovered, focused or touched.
//
// The database still stores this content (`npm --prefix backend run
// migrate:content` pushes this file into it), but it is a mirror, not the
// source: a slug missing from the file genuinely does not exist here and
// redirects to the index.
//
// Keyed by id so the lookup does not rescan 38 posts on every navigation.
const postsBySlug = new Map(
  staticBlogPosts.map((post) => {
    const id = post.id || post.slug;
    return [id, adaptBlogPost({...post, slug: id})];
  }),
);

const BlogDetailPage = () => {
  const {slug} = useParams();
  const post = postsBySlug.get(slug) || null;

  // Shared with scripts/prerender.mjs — see the note in pageMeta.js.
  const description = blogMeta(post)?.description;
  useDocumentTitle(post && post.title, description);

  // RouteMeta deliberately leaves per-article routes alone. The page owns its
  // canonical and share card so each article gets its own title and URL.
  useEffect(() => {
    if (!post) return;

    applySeo({
      title: composeTitle(post.seo?.title || post.title),
      description,
      url: absoluteUrl(`/blog/${post.id}`),
      image: post.image || OG_IMAGE,
      type: "article",
    });
  }, [description, post]);

  // BlogPosting earns the article treatment in search results — headline, date
  // and publisher instead of a bare blue link. The trail gives the result a
  // "CareerVeda › Blog › <title>" breadcrumb rather than a raw URL.
  useJsonLd("ld-blog-article", post && articleSchema(post));
  useJsonLd(
    "ld-blog-breadcrumb",
    post &&
      breadcrumbSchema([
        {name: "Home", path: "/"},
        {name: "Blog", path: "/blog"},
        {name: post.title, path: `/blog/${post.id}`},
      ]),
  );

  // The file is the whole catalogue, so an unknown slug is a dead URL now
  // rather than possibly-still-loading. No spinner, no blank frame.
  if (!post) return <Navigate to="/blog" replace />;

  return <BlogArticle post={post} />;
};

export default BlogDetailPage;
