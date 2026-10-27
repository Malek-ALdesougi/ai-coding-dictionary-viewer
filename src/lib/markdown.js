import { marked } from "marked";
import DOMPurify from "dompurify";

/** Markdown from the dictionary vault -> sanitised HTML. */
export const renderMarkdown = md => DOMPurify.sanitize(marked.parse(md, { async: false }), { ADD_ATTR: ["target"] });
