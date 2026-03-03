import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { siteConfig } from "@/site-config";
import { sortMDByDate, getMainPosts } from "@/utils";

export const GET = async () => {
	const allPosts = await getCollection("post");
	const posts = sortMDByDate(getMainPosts(allPosts));

	return rss({
		title: siteConfig.title,
		description: siteConfig.description,
		site: import.meta.env.SITE,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.publishDate,
			link: `posts/${post.slug}`,
		})),
	});
};
