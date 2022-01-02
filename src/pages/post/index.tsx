import { graphql, useStaticQuery } from "gatsby";
import React from "react";

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
  const data = useStaticQuery(GET_ALL_POST_QUERY);
  console.log(data);
  return <div />;
}
