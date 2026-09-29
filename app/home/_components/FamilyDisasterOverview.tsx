import Link from "next/link";

import {
  isFamilyPrepared,
  type HomePlanSummary,
  type HomeSupplySummary,
} from "@/utils/homeOverview";

interface FamilyDisasterOverviewProps {
  teamName: string;
  supplies: HomeSupplySummary;
  plans: HomePlanSummary;
}

const detailLinkClass = "text-sm text-black underline underline-offset-2";

interface HomeTask {
  href: string;
  label: string;
  count?: number;
}

function planHref(section: string, count: number): string {
  const add = count <= 0 ? "&add=1" : "";
  return `/handbook?checkpoint=plans&section=${section}${add}`;
}

function TaskLink({ href, label, count }: HomeTask) {
  return (
    <Link
      className='flex items-baseline justify-between gap-4 rounded-xl border border-[#F39800] bg-white px-5 py-4'
      href={href}
    >
      <span className='text-base font-bold text-black'>{label}</span>
      {count === undefined ? (
        <span className='shrink-0 text-sm text-black'>まだない</span>
      ) : (
        <span className='shrink-0 text-black'>
          <span className='text-2xl font-bold leading-none'>{count}</span>
          <span className='ml-0.5 text-sm'>件</span>
        </span>
      )}
    </Link>
  );
}

function TaskGroup({ title, tasks }: { title: string; tasks: HomeTask[] }) {
  if (tasks.length === 0) return null;

  return (
    <section>
      <h2 className='text-lg font-bold text-black mb-3'>{title}</h2>
      <div className='space-y-3'>
        {tasks.map((task) => (
          <TaskLink key={task.label} {...task} />
        ))}
      </div>
    </section>
  );
}

export default function FamilyDisasterOverview({
  teamName,
  supplies,
  plans,
}: FamilyDisasterOverviewProps) {
  const prepared = isFamilyPrepared(supplies, plans);
  const stockTasks: HomeTask[] = [
    supplies.total === 0
      ? { href: "/supplies/add", label: "家にある備蓄を登録する" }
      : null,
    supplies.out > 0
      ? {
          href: "/supplies/list?focus=out",
          label: "在庫が切れている備蓄",
          count: supplies.out,
        }
      : null,
    supplies.short > 0
      ? {
          href: "/supplies/list?focus=short",
          label: "用意したい量に足りない備蓄",
          count: supplies.short,
        }
      : null,
    supplies.nearExpiry > 0
      ? {
          href: "/supplies/list?focus=near",
          label: "期限が近づいている備蓄",
          count: supplies.nearExpiry,
        }
      : null,
    supplies.expired > 0
      ? {
          href: "/supplies/list?focus=expired",
          label: "期限が切れている備蓄",
          count: supplies.expired,
        }
      : null,
  ].flatMap((task) => (task ? [task] : []));

  const planTasks: HomeTask[] = [
    plans.evacuationSites <= 0
      ? {
          href: planHref("sites", plans.evacuationSites),
          label: "避難する場所を決める",
        }
      : null,
    plans.evacuationRoutes <= 0
      ? {
          href: planHref("routes", plans.evacuationRoutes),
          label: "避難する道を決める",
        }
      : null,
    plans.safetyMethods <= 0
      ? {
          href: planHref("safety", plans.safetyMethods),
          label: "安否の確認方法を決める",
        }
      : null,
    plans.familyAgreements <= 0
      ? {
          href: planHref("agreements", plans.familyAgreements),
          label: "家族の約束を決める",
        }
      : null,
  ].flatMap((task) => (task ? [task] : []));

  return (
    <div className='-mx-4 -my-4 min-h-[calc(100vh-4.5rem)] bg-[#FFF0D6] px-4 py-8 sm:-mx-6 sm:-my-6 sm:px-6'>
      <div className='container mx-auto max-w-2xl'>
        <header className='mb-8 flex flex-wrap items-end justify-between gap-4'>
          <div>
            <p className='text-sm text-black'>家族の防災情報</p>
            <h1 className='text-3xl font-bold text-black mt-1'>{teamName}</h1>
          </div>
          <Link
            className='inline-flex items-center rounded-md border border-[#F39800] bg-white px-4 py-2 text-sm font-bold text-black'
            href='/settings?tab=team#invite'
          >
            家族を招待する
          </Link>
        </header>

        {prepared ? (
          <section className='rounded-xl border border-[#F39800] bg-white p-6'>
            <p className='text-lg font-bold text-black'>登録できています</p>
          </section>
        ) : (
          <div className='space-y-8'>
            <TaskGroup tasks={stockTasks} title='家にある備蓄' />
            <TaskGroup tasks={planTasks} title='災害のときに家族ですること' />
          </div>
        )}

        <div className='mt-8 flex flex-wrap gap-x-5 gap-y-2'>
          <Link className={detailLinkClass} href='/supplies/list'>
            登録した備蓄を見る
          </Link>
          <Link className={detailLinkClass} href='/handbook'>
            備えておくとよいものを見る
          </Link>
          <Link className={detailLinkClass} href='/supplies/history'>
            使った備蓄の記録を見る
          </Link>
        </div>
      </div>
    </div>
  );
}
