import { graphql, useStaticQuery } from "gatsby";
import React from "react";
import { GetAllPostsQuery } from "src/gatsby-graphql";

const GET_ALL_POST_QUERY = graphql`
  query GetAllPosts {
    allMarkdownRemark(
      limit: 10
      sort: { order: DESC, fields: frontmatter___date }
    ) {
      edges {
        node {
          id
          frontmatter {
            title
            date
          }
        }
      }
    }
  }
`;

export default function PostList() {
  const { allMarkdownRemark } =
    useStaticQuery<GetAllPostsQuery>(GET_ALL_POST_QUERY);
  return (
    <div>
      {allMarkdownRemark.edges.map((md) => {
        return <p key={md.node.id}>{md.node.frontmatter?.title}</p>;
      })}
    </div>
  );
}
