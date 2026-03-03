import type { CollectionEntry } from "astro:content";

export function sortMDByDate(posts: Array<CollectionEntry<"post">>) {
	return posts.sort((a, b) => {
		const aDate = new Date(a.data.updatedDate ?? a.data.publishDate).valueOf();
		const bDate = new Date(b.data.updatedDate ?? b.data.publishDate).valueOf();
		return bDate - aDate;
	});
}

export function getAllTags(posts: Array<CollectionEntry<"post">>) {
	return posts.flatMap((post) => [...post.data.tags]);
}

export function getUniqueTags(posts: Array<CollectionEntry<"post">>) {
	return [...new Set(getAllTags(posts))];
}

export function getUniqueTagsWithCount(
	posts: Array<CollectionEntry<"post">>,
): Array<[string, number]> {
	return [
		...getAllTags(posts).reduce(
			(acc, t) => acc.set(t, (acc.get(t) || 0) + 1),
			new Map<string, number>(),
		),
	].sort((a, b) => b[1] - a[1]);
}

/**
 * Get the set of slugs that are translations (referenced by another post's translationSlug).
 * These should be excluded from main post listings, RSS, sitemap, etc.
 */
export function getTranslationSlugs(posts: Array<CollectionEntry<"post">>): Set<string> {
	return new Set(
		posts
			.filter((p) => p.data.translationSlug)
			.map((p) => p.data.translationSlug!),
	);
}

/**
 * Filter out translation-only posts, returning only "main" posts.
 */
export function getMainPosts(posts: Array<CollectionEntry<"post">>): Array<CollectionEntry<"post">> {
	const translationSlugs = getTranslationSlugs(posts);
	return posts.filter((p) => !translationSlugs.has(p.slug));
}
