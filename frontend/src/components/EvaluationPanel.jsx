import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Sparkles, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const RULE_NAMES = {
  'F-01': 'API Protocol Fit',
  'F-02': 'Single Point of Failure Identification',
  'F-03': 'Stateless Service Layer',
  'F-04': 'Database Selection Justification',
  'F-05': 'Caching Layer Presence',
  'F-06': 'Cache Eviction Policy Declared',
  'F-07': 'Load Balancer Placement',
  'F-08': 'HTTP Status Code Correctness',
  'F-09': 'Idempotency for Write Operations',
  'F-10': 'Authentication Mechanism Defined',
  'F-11': 'DNS and CDN for Public-Facing Systems',
  'F-12': 'Synchronous vs Asynchronous Boundary',
  'F-13': 'Data Replication Strategy Stated',
  'F-14': 'Monolith vs Microservice Justified',
  'F-15': 'Back-of-Envelope Estimates Present',
  'F-16': 'Functional Requirements Separation',
  'F-17': 'Failure Mode Acknowledgment',
  'F-18': 'Data Storage Separation by Access',
  'F-19': 'Unique ID Strategy Defined',
  'F-20': 'External Dependency Boundaries Drawn',
  'P-01': 'Horizontal Scaling Path Defined',
  'P-02': 'Database Sharding Strategy Valid',
  'P-03': 'Read/Write Ratio Influences Architecture',
  'P-04': 'Rate Limiting Strategy Specified',
  'P-05': 'Latency Budget Allocated',
  'P-06': 'Connection Pooling for Database',
  'P-07': 'Async Processing for Non-Critical Path',
  'P-08': 'Consistency Model Declared',
  'P-09': 'CAP Theorem Trade-off Acknowledged',
  'P-10': 'Distributed Transaction Handling',
  'P-11': 'Idempotent Message Consumer',
  'P-12': 'Dead Letter Queue for Message Failures',
  'P-13': 'Consensus Mechanism for Leader Election',
  'P-14': 'Partitioning Does Not Break Query Patterns',
  'P-15': 'Circuit Breaker on External Calls',
  'P-16': 'Retry Logic with Exponential Backoff',
  'P-17': 'Availability SLA Matched to Architecture',
  'P-18': 'Graceful Degradation Path Exists',
  'P-19': 'Health Check and Auto-Recovery Defined',
  'P-20': 'Event Sourcing Snapshot Strategy',
  'P-21': 'CQRS Command and Query Models Separate',
  'P-22': 'Search Index is Not Primary Store',
  'P-23': 'Time-Series Data Uses Appropriate Storage',
  'P-24': 'Object Storage for Binary Assets',
  'P-25': 'Secrets Not in Application Config',
  'P-26': 'Data Encryption at Rest and in Transit',
  'P-27': 'Authorization Layer Distinct from Auth',
  'P-28': 'PII Data Access Is Audited',
  'P-29': 'Three Pillars of Observability Present',
  'P-30': 'Alerting Tied to SLOs Not Thresholds',
};

const CONFIDENCE_RANK = { high: 0, medium: 1, low: 2 };

const tierBadgeClass = (ruleTier) => {
  if (ruleTier === 'pro') return 'text-blue-700 bg-blue-50 border-blue-200';
  if (ruleTier === 'enterprise') return 'text-violet-700 bg-violet-50 border-violet-200';
  return 'text-gray-700 bg-gray-100 border-gray-200';
};

const confidenceClass = (confidence) => {
  if (confidence === 'high') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (confidence === 'medium') return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-gray-600 bg-gray-100 border-gray-200';
};

const monthlyCreditsForTier = (workspaceTier) => {
  if (workspaceTier === 'core') return 5;
  if (workspaceTier === 'individual') return 50;
  return null;
};

export default function EvaluationPanel({
  status,
  score,
  summary,
  results,
  suggestions,
  creditsExhausted,
  creditsRemaining,
  workspaceTier,
  geminiError,
  error,
  onClose,
  onHighlight,
}) {
  const [expandedFailedRuleIds, setExpandedFailedRuleIds] = useState(() => new Set());
  const [showPassing, setShowPassing] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);

  const failedRules = useMemo(() => {
    const list = (results || []).filter((item) => item.passed === false);
    return list.sort((a, b) => (CONFIDENCE_RANK[a.confidence] ?? 3) - (CONFIDENCE_RANK[b.confidence] ?? 3));
  }, [results]);
  const passingRules = useMemo(() => (results || []).filter((item) => item.passed === true), [results]);
  const skippedRules = useMemo(() => (results || []).filter((item) => item.passed === null), [results]);

  const byRuleTier = summary?.byRuleTier || {};
  const basic = byRuleTier.basic || { total: 0, passed: 0, failed: 0 };
  const pro = byRuleTier.pro || { total: 0, passed: 0, failed: 0 };
  const enterprise = byRuleTier.enterprise || { total: 0, passed: 0, failed: 0 };

  const monthlyCredits = monthlyCreditsForTier(workspaceTier);
  const creditsUsed = monthlyCredits != null && creditsRemaining != null ? Math.max(monthlyCredits - creditsRemaining, 0) : null;
  const creditProgress = monthlyCredits ? Math.min(Math.round((creditsUsed / monthlyCredits) * 100), 100) : null;

  const toggleFailedRule = (ruleId) => {
    setExpandedFailedRuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) next.delete(ruleId);
      else next.add(ruleId);
      return next;
    });
  };

  return (
    <aside className="canvas-evaluation-panel absolute top-0 right-0 h-full w-[380px] max-w-[90vw] border-l border-gray-200 bg-white shadow-xl z-40 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">AI Evaluation</p>
          <p className="text-xs text-gray-500">Rule engine + AI suggestions</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50"
          title="Close evaluation panel"
        >
          <XCircle size={14} className="mx-auto" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(status === 'scoring' || status === 'awaiting_ai') && !summary && (
          <section className="rounded-xl border border-gray-200 p-3 bg-gray-50 text-xs text-gray-600 flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
            {status === 'scoring' ? 'Queued for background evaluation…' : 'Evaluation in progress…'}
          </section>
        )}

        {status !== 'idle' && summary && (
          <section className="rounded-xl border border-gray-200 p-3 bg-gray-50">
            <div className="text-3xl font-bold text-gray-900">{score ?? 0}%</div>
            <p className="text-xs text-gray-600 mt-1">
              {summary.passed ?? 0} of {summary.applicable ?? 0} applicable rules passed
            </p>
          </section>
        )}

        {status !== 'idle' && summary && (
          <section className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-gray-200 p-2 bg-white">
              <div className="text-[11px] text-gray-500">Basic</div>
              <div className="text-sm font-semibold text-gray-900">{basic.passed}/{basic.total}</div>
            </div>
            {workspaceTier !== 'core' && (
              <>
                <div className="rounded-lg border border-gray-200 p-2 bg-white">
                  <div className="text-[11px] text-gray-500">Pro</div>
                  <div className="text-sm font-semibold text-gray-900">{pro.passed}/{pro.total}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-2 bg-white">
                  <div className="text-[11px] text-gray-500">Enterprise</div>
                  <div className="text-sm font-semibold text-gray-900">{enterprise.passed}/{enterprise.total}</div>
                </div>
              </>
            )}
          </section>
        )}

        {workspaceTier === 'core' && (
          <section className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-900">
            <p className="text-xs font-medium">Evaluated against 20 of 50 rules.</p>
            <p className="text-xs">Upgrade to Individual or Team to unlock the full evaluation.</p>
            <Link
              to="/pricing"
              className="mt-2 inline-flex items-center px-2.5 py-1.5 text-xs rounded-md border border-blue-300 bg-white font-semibold"
            >
              Upgrade
            </Link>
          </section>
        )}

        <section className="rounded-lg border border-gray-200 p-3 bg-white">
          {!creditsExhausted ? (
            <>
              <p className="text-xs text-gray-700">{creditsRemaining ?? 0} AI credits remaining this month</p>
              <div className="mt-2 h-1.5 w-full rounded bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${creditProgress == null ? 0 : Math.max(0, 100 - creditProgress)}%` }}
                />
              </div>
            </>
          ) : (
            <div className="text-xs text-amber-700">
              AI credits exhausted.{' '}
              <Link to="/pricing" className="underline font-semibold">
                Upgrade or buy add-on credits.
              </Link>
            </div>
          )}
        </section>

        <section className="space-y-2">
          {failedRules.map((rule) => {
            const isOpen = expandedFailedRuleIds.has(rule.id);
            return (
              <div key={rule.id} className="rounded-lg border border-red-200 bg-red-50/30 p-2.5">
                <div className="flex items-start gap-2">
                  <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-1.5 py-0.5 border rounded text-[10px] font-semibold font-mono ${tierBadgeClass(rule.ruleTier)}`}>
                        {rule.id}
                      </span>
                      <span className="text-xs font-semibold text-gray-900 truncate">{RULE_NAMES[rule.id] || 'Unknown Rule'}</span>
                      <span className={`px-1.5 py-0.5 border rounded text-[10px] ${confidenceClass(rule.confidence)}`}>
                        {rule.confidence}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleFailedRule(rule.id)}
                        className="text-[11px] font-medium text-gray-700 inline-flex items-center gap-1"
                      >
                        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {isOpen ? 'Hide reason' : 'Show reason'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onHighlight?.(rule.affectedNodeIds || [], rule.affectedEdgeIds || [])}
                        className="text-[11px] font-semibold text-blue-700"
                      >
                        Highlight on canvas
                      </button>
                    </div>
                    {isOpen && <p className="mt-2 text-xs text-gray-700 leading-relaxed">{rule.reason}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setShowPassing((prev) => !prev)}
            className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 flex items-center justify-between"
          >
            Show {passingRules.length} passing rules
            {showPassing ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showPassing && (
            <div className="px-3 pb-3 space-y-1.5">
              {passingRules.map((rule) => (
                <div key={rule.id} className="text-xs text-gray-700 flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  <span className="font-mono text-[11px]">{rule.id}</span>
                  <span className="truncate">{RULE_NAMES[rule.id] || 'Unknown Rule'}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setShowSkipped((prev) => !prev)}
            className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 flex items-center justify-between"
          >
            Show {skippedRules.length} not-applicable rules
            {showSkipped ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showSkipped && (
            <div className="px-3 pb-3 space-y-1.5">
              {skippedRules.map((rule) => (
                <div key={rule.id} className="text-xs text-gray-700 flex items-center gap-2">
                  <AlertCircle size={12} className="text-gray-400 shrink-0" />
                  <span className="font-mono text-[11px]">{rule.id}</span>
                  <span className="truncate">{RULE_NAMES[rule.id] || 'Unknown Rule'}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <hr className="border-gray-200" />

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Sparkles size={14} className="text-violet-500" />
            AI Suggestions
          </div>

          {status === 'awaiting_ai' && !creditsExhausted && (
            <div className="rounded-lg border border-gray-200 p-3 text-xs text-gray-600 flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
              Generating suggestions...
            </div>
          )}

          {typeof suggestions === 'string' && (
            <pre className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 whitespace-pre-wrap break-words font-sans leading-relaxed">
              {suggestions}
            </pre>
          )}

          {creditsExhausted && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              AI suggestions are unavailable because credits are exhausted.{' '}
              <Link to="/pricing" className="underline font-semibold">
                Upgrade or add credits.
              </Link>
            </div>
          )}

          {geminiError && !suggestions && !creditsExhausted && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Could not reach AI service.
            </div>
          )}

          {status === 'error' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>
          )}
        </section>
      </div>
    </aside>
  );
}
