import markdown from "../../../spec/plugin-authoring.md?raw";

export default function PluginAuthoringPage() {
  return (
    <article className="prose">
      <h1>Plugin authoring cookbook</h1>
      <p>
        Tài liệu đầy đủ nằm tại <code>docs/spec/plugin-authoring.md</code>. Trang này import raw
        Markdown để docs build bắt lỗi đường dẫn và đảm bảo cookbook luôn đi cùng site.
      </p>
      <pre className="markdown-raw">
        <code>{markdown}</code>
      </pre>
    </article>
  );
}
