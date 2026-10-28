"use client";

import ApiTab from "@/components/ApiTab";
import PageHeader from "@/components/PageHeader";
import { useEvaluations } from "@/lib/evaluations";

export default function ApiDocs() {
  const { evaluations } = useEvaluations();
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Overview", href: "/" }, { label: "API docs" }]}
        title="API docs"
        subtitle="The same evaluation pipeline as a JSON API. Try it with your own copy."
      />
      <ApiTab initialCopy={evaluations[0]?.copy} />
    </>
  );
}
