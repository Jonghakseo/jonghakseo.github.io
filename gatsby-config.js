const path = require("path");

module.exports = {
  pathPrefix: "jonghakseo.github.io",
  siteMetadata: {
    siteUrl: "https://jonghakseo.github.io",
    title: "jonghakseo.github.io",
    description: "Jonghakseo Dev Blog",
  },
  plugins: [
    "gatsby-transformer-sharp",
    `gatsby-plugin-provide-react`,
    "gatsby-plugin-sharp",
    "gatsby-plugin-react-helmet",
    "gatsby-plugin-sitemap",
    "gatsby-plugin-styled-components",
    "gatsby-plugin-image",
    {
      resolve: `gatsby-plugin-typescript`,
      options: {
        isTSX: true,
        jsxPragma: `jsx`,
        allExtensions: true,
      },
    },
    {
      resolve: "gatsby-plugin-google-analytics",
      options: {
        trackingId: "G-08GBQWYJXH",
      },
    },
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
        path: `${__dirname}/src/pages`,
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
    {
      resolve: "gatsby-plugin-extract-schema",
      options: {
        dest: path.resolve(process.cwd(), "src", "schema.graphql"),
      },
    },
    // {
    //   resolve: `gatsby-plugin-graphql-codegen`,
    //   options: {
    //     fileName: `./src/gatsby-graphql.ts`,
    //     additionalSchemas: ["./src/schema.graphql"],
    //   },
    // },
  ],
};
