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

function postThumbToStatic(mode) {
  const prefix = mode === "build" ? "docs" : "public";
  fs.cpSync(
    path.join(__dirname, "post-thumb"),
    path.join(__dirname, prefix + "/static/post-thumb"),
    {
      recursive: true,
    }
  );
}

exports.onPreInit = () => {
  if (process.argv[2] === "build") {
    try {
      fs.rmSync(path.join(__dirname, "docs"), { recursive: true });
      postThumbToStatic("build");
    } catch (e) {
      console.error(e);
    }
  } else {
    postThumbToStatic("dev");
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
        components: path.resolve(__dirname, "src/components"),
        src: path.resolve(__dirname, "src"),
      },
    },
  });
};
