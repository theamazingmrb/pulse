import ProjectsClient from "./ProjectsClient";

// Force dynamic rendering to prevent prerendering at build time
export const dynamic = "force-dynamic";

export default function ProjectsPage() {
  return <ProjectsClient />;
}