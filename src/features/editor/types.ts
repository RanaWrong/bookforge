export type EditorMark = { type: string; attrs?: Record<string, string | number | boolean | null> };
export type EditorNode = {
  type: string;
  attrs?: Record<string, string | number | boolean | null>;
  text?: string;
  marks?: EditorMark[];
  content?: EditorNode[];
};
export type EditorDocument = EditorNode & { type: "doc"; content: EditorNode[] };
