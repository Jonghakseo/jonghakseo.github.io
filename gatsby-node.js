const path = require("path");
const fs = require("fs");
const { createFilePath } = require("gatsby-source-filesystem");

exports.onCreateNode = ({ node, getNode, actions }) => {
  const { createNodeField } = actions;

  // 새로운 노드가 생성 됐을떄 실행 되는 함수
  if (node.internal.type === `MarkdownRemark`) {
    // markdown 노드가 생성 될떄만 콘솔 찍음
    const fileNode = getNode(node.parent);
    const slug = createFilePath({ node, getNode, basePath: "pages/post" });
    createNodeField({
      node,
      name: `slug`,
      value: slug,
    });
    console.log(createFilePath({ node, getNode, basePath: `pages` }));
    //파일명으로 정보를y 얻어옴
    console.log(`\n`, fileNode.relativePath);
  }
};

exports.createPages = async ({ graphql, actions }) => {
  const { createPage } = actions;

  const result = await graphql(`
    query {
      allMarkdownRemark {
        edges {
          node {
            fields {
              slug
            }
          }
        }
      }
    }
  `);

  console.log(JSON.stringify(result, null, 4));

  result.data.allMarkdownRemark.edges.forEach(({ node }) => {
    createPage({
      path: `post${node.fields.slug}`,
      component: path.resolve("./src/PostTemplate/index.js"),
      context: {
        slug: node.fields.slug,
      },
    });
  });
};

exports.onPreInit = () => {
  if (process.argv[2] === "build") {
    fs.rmSync(path.join(__dirname, "docs"), { recursive: true });
  }
};

exports.onPostBuild = () => {
  fs.renameSync(path.join(__dirname, "public"), path.join(__dirname, "docs"));
};

// Setup Import Alias
exports.onCreateWebpackConfig = ({ getConfig, actions }) => {
  const output = getConfig().output || {};

  actions.setWebpackConfig({
    output,
    resolve: {
      alias: {
        pages: path.resolve(__dirname, "src/pages"),
      },
    },
  });
};
