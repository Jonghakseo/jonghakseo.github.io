const path = require("path");

module.exports = {
  pathPrefix: "jonghakseo.github.io",
  siteMetadata: {
    siteUrl: "https://jonghakseo.github.io",
    title: "jonghakseo.github.io",
  },
  plugins: [
    {
      resolve: `gatsby-plugin-typescript`,
      options: {
        isTSX: true, // defaults to false
        jsxPragma: `jsx`, // defaults to "React"
        allExtensions: true, // defaults to false
      },
    },
    // {
    //   resolve: "gatsby-plugin-extract-schema",
    //   options: {
    //     dest: path.resolve(process.cwd(), "src", "schema.graphql"),
    //   },
    // },
    // {
    //   resolve: `gatsby-plugin-graphql-codegen`,
    //   options: {
    //     fileName: `./src/gatsby-graphql.ts`,
    //     additionalSchemas: ["./src/schema.graphql"],
    //   },
    // },
    "gatsby-plugin-styled-components",
    "gatsby-plugin-image",
    {
      resolve: "gatsby-plugin-google-analytics",
      options: {
        trackingId: "G-08GBQWYJXH",
      },
    },
    "gatsby-plugin-react-helmet",
    "gatsby-plugin-sitemap",
    {
      resolve: "gatsby-plugin-manifest",
      options: {
        icon: `${__dirname}/images/icon.png`,
      },
    },
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
          {
            resolve: `gatsby-remark-highlight-code`,
            options: {
              terminal: "carbon",
              theme: "dracula",
            },
          },
          {
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 590,
            },
          },
        ],
      },
    },
    "gatsby-plugin-sharp",
    "gatsby-transformer-sharp",
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "images",
        path: `${__dirname}/images`,
      },
      __key: "images",
    },
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "pages",
        path: "./src/pages/",
      },
      __key: "pages",
    },
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "post-img",
        path: `${__dirname}/post-img`,
      },
      __key: "post-img",
    },
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "markdown-pages",
        path: `${__dirname}/post-mds`,
      },
    },
  ],
};
