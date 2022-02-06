const path = require("path");
const fs = require("fs");
const { createFilePath } = require("gatsby-source-filesystem");

exports.onCreateNode = ({ node, getNode, actions }) => {
  const { createNodeField } = actions;
  if (node.internal.type === `MarkdownRemark`) {
    const slug = createFilePath({ node, getNode, basePath: "pages/post" });
    createNodeField({
      node,
      name: `slug`,
      value: slug,
    });
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

  result.data.allMarkdownRemark.edges.forEach(({ node }) => {
    createPage({
      path: `post${node.fields.slug}`,
      component: path.resolve(
        `${__dirname}/src/components/layout/PostTemplate/index.tsx`
      ),
      context: {
        slug: node.fields.slug,
      },
    });
  });
};

exports.onPreBuild = () => {
  try {
    fs.rmSync(path.join(__dirname, "docs"), { recursive: true });
  } catch (e) {
    console.error(e);
  }
};

exports.onPostBuild = () => {
  fs.renameSync(path.join(__dirname, "public"), path.join(__dirname, "docs"));
};

// Setup Import Alias
exports.onCreateWebpackConfig = ({ getConfig, actions }) => {
  const output = getConfig().output || {};
  console.log("setups", path.resolve(__dirname, "src"));
  actions.setWebpackConfig({
    output,
    resolve: {
      alias: {
        pages: path.resolve(__dirname, "src/pages"),
        components: path.resolve(__dirname, "src/components"),
        src: path.resolve(__dirname, "src"),
      },
    },
  });
};
