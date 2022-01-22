import { graphql, PageProps } from "gatsby";
import { Query } from "src/gatsby-graphql";
import { defineCustomElements as deckDeckGoHighlightElement } from "@deckdeckgo/highlight-code/dist/loader";
import HitCounter from "components/post/HitCounter";
import NotFoundPage from "pages/404";

void deckDeckGoHighlightElement();

interface TemplateProps extends PageProps {
  data: Query;
}

export default function PostTemplate(props: TemplateProps) {
  const { data, location } = props;
  const post = data.markdownRemark;
  if (!post) return <NotFoundPage />;
  const { frontmatter } = post;

  return (
    <div>
      <div>
        <h1>{frontmatter?.title}</h1>
        <HitCounter href={location.href} />
        {/* eslint-disable-next-line react/no-danger */}
        <div dangerouslySetInnerHTML={{ __html: `${post?.html}` }} />
      </div>
    </div>
  );
}

export const query = graphql`
  query ($slug: String!) {
    markdownRemark(fields: { slug: { eq: $slug } }) {
      html
      frontmatter {
        title
      }
    }
  }
`;
