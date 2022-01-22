import React from "react";
import { graphql, Link, useStaticQuery } from "gatsby";
import {
  GetAllPostsQuery,
  MarkdownRemarkFrontmatter,
} from "src/gatsby-graphql";

const GET_ALL_POST_QUERY = graphql`
  query GetAllPosts {
    allMarkdownRemark(
      limit: 1000
      sort: { order: DESC, fields: frontmatter___date }
    ) {
      edges {
        node {
          id
          fields {
            slug
          }
          frontmatter {
            title
            date
            tags
          }
        }
      }
    }
  }
`;

type PostNode = MarkdownRemarkFrontmatter & {
  id: string;
  path: string;
};
export default function PostList() {
  const { allMarkdownRemark } =
    useStaticQuery<GetAllPostsQuery>(GET_ALL_POST_QUERY);

  const posts: PostNode[] = allMarkdownRemark.edges.map(({ node }) => ({
    id: node.id,
    path: `${node.fields?.slug}`,
    ...node.frontmatter,
  }));

  return (
    <div>
      {posts.map((post) => {
        const { id, title, date, path } = post;
        return (
          <Link key={id} to={`/post${path}`}>
            <p>
              {title}
              {date}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
