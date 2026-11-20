import { Link } from "react-router-dom";
import { ArrowUpRight, CornerDownLeft } from "lucide-react";
import type { Problem, TestCase } from "@/types/db";
import { useI18n } from "@/i18n";
import { Markdown } from "@/components/common/Markdown";
import { DifficultyBadge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export function ProblemPanel({ problem, samples, topicName, onUseInput }: {
  problem: Problem; samples: TestCase[]; topicName?: string; onUseInput: (input: string) => void;
}) {
  const { t, lang } = useI18n();
  const title = lang === "bn" && problem.title_bn ? problem.title_bn : problem.title;
  const statement = lang === "bn" && problem.statement_bn ? problem.statement_bn : problem.statement;
  return (
    <div className="space-y-5 text-paper">
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-lime">{topicName ?? "—"} • {t(`common.${problem.difficulty}`)}</p>
        <h2 className="mt-2 text-xl font-extrabold leading-snug">{title}</h2>
        <div className="mt-2 flex items-center gap-2">
          <DifficultyBadge difficulty={problem.difficulty} />
          <Link to={`/problems/${problem.slug}`} className="inline-flex items-center gap-1 text-xs text-paper/60 hover:text-lime">
            {t("ide.backToProblem")} <ArrowUpRight className="size-3" />
          </Link>
        </div>
      </div>
      <Markdown dark>{statement}</Markdown>
      {problem.input_format && (<section><p className="eyebrow mb-1">{t("problems.inputFormat")}</p><Markdown dark>{problem.input_format}</Markdown></section>)}
      {problem.output_format && (<section><p className="eyebrow mb-1">{t("problems.outputFormat")}</p><Markdown dark>{problem.output_format}</Markdown></section>)}
      {problem.constraints && (<section><p className="eyebrow mb-1">{t("problems.constraints")}</p><p className="font-mono text-sm">{problem.constraints}</p></section>)}
      {samples.map((s, i) => (
        <section key={s.id} className="rounded border border-ink-600 bg-ink p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="eyebrow">{t("ide.sample", { n: i + 1 })}</p>
            <Button variant="ghost-dark" size="sm" onClick={() => onUseInput(s.input)}><CornerDownLeft /> {t("ide.input")}</Button>
          </div>
          <div className="grid grid-cols-2 gap-3 font-mono text-[13px]">
            <div><p className="mb-1 text-paper/50">{t("problems.sampleInput")}</p><pre className="whitespace-pre-wrap">{s.input}</pre></div>
            <div><p className="mb-1 text-paper/50">{t("problems.sampleOutput")}</p><pre className="whitespace-pre-wrap text-lime">{s.expected_output}</pre></div>
          </div>
        </section>
      ))}
      {problem.explanation && (<section><p className="eyebrow mb-1">{t("problems.explanation")}</p><Markdown dark>{problem.explanation}</Markdown></section>)}
    </div>
  );
}
