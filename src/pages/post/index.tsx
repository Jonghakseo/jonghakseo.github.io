import { graphql, useStaticQuery } from "gatsby";
import React from "react";
import { GetAllPostsQuery } from "../../gatsby-graphql";

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
  console.log(allMarkdownRemark);
  return <div>hi</div>;
}
