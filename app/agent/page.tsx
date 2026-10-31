import PageHeader, { btnGhost } from "@/components/PageHeader";

const agentUrl =
  "https://copilotstudio.microsoft.com/environments/c3f69c4a-6d87-eed6-8326-add5d43efbd5/bots/crcb8_m365_zWune9/webchat?__version__=2&enableFileAttachment=false&cliAgent=true";

export default function AgentChatbot() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Overview", href: "/" }, { label: "Agent Chatbot" }]}
        title="Agent Chatbot"
        subtitle="Chat with your Microsoft Copilot Studio agent."
        actions={
          <a href={agentUrl} target="_blank" rel="noopener noreferrer" className={btnGhost}>
            Open in new tab
          </a>
        }
      />
      <div className="h-[calc(100dvh-14rem)] min-h-[520px] overflow-hidden rounded-2xl border border-line bg-card">
        <iframe
          src={agentUrl}
          title="Microsoft Copilot Studio agent chatbot"
          className="h-full w-full border-0"
        />
      </div>
    </>
  );
}
