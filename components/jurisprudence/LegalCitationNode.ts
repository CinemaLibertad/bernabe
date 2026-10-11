import { Node, mergeAttributes } from "@tiptap/core";

const dataAttribute = (key: string) => ({
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute(`data-${key}`),
  renderHTML: (attributes: Record<string, string | null>) => attributes[key] == null ? {} : { [`data-${key}`]: attributes[key] },
});

export const LegalCitationNode = Node.create({
  name: "legalCitation",
  group: "block",
  atom: true,
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      citationId: dataAttribute("citation-id"),
      excerpt: dataAttribute("excerpt"),
      source: dataAttribute("source"),
      sourceTitle: dataAttribute("source-title"),
      caption: dataAttribute("caption"),
      court: dataAttribute("court"),
      decisionDate: dataAttribute("decision-date"),
      jurisdiction: dataAttribute("jurisdiction"),
      officialUrl: dataAttribute("official-url"),
      verificationStatus: { ...dataAttribute("verification-status"), default: "pending" },
    };
  },
  parseHTML() {
    return [{ tag: "blockquote[data-legal-citation]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const label = [HTMLAttributes.source, HTMLAttributes.court, HTMLAttributes.caption || HTMLAttributes.sourceTitle, HTMLAttributes.decisionDate]
      .filter(Boolean).join(" · ");
    return ["blockquote", mergeAttributes(HTMLAttributes, { "data-legal-citation": "true", class: "legal-citation-block" }),
      ["div", { class: "legal-citation-excerpt" }, HTMLAttributes.excerpt || "Fragmento no disponible"],
      ["footer", { class: "legal-citation-reference" }, label || "Referencia jurisprudencial", " · ", HTMLAttributes.verificationStatus === "verified" ? "fuente verificada" : "pendiente de verificación"],
    ];
  },
});
