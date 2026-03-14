import { Indexer } from "algosdk";

function parseUint64s(b64) {
  const buf = Buffer.from(b64, "base64");
  const result = [];
  for (let i = 0; i < buf.length; i += 8) {
    let val = BigInt(0);
    for (let j = 0; j < 8; j++) val = (val << BigInt(8)) + BigInt(buf[i + j]);
    result.push(val);
  }
  return result;
}

function extractDeltas(tx, appId, roundTime, out) {
  const delta = tx.globalStateDelta || tx["global-state-delta"];
  const rawId = tx.applicationTransaction?.applicationId
    ?? tx["application-transaction"]?.["application-id"];
  if (delta && Number(rawId) === appId) out.push({ delta, time: roundTime });
  const inners = tx.innerTxns || tx["inner-txns"] || [];
  for (const inner of inners) extractDeltas(inner, appId, roundTime, out);
}

async function fetchMonthSnapshots(indexer, appId, decimals, afterTime, beforeTime) {
  const snapshots = [];
  let nextToken = undefined;
  while (true) {
    let req = indexer.searchForTransactions()
      .applicationID(appId)
      .afterTime(afterTime)
      .beforeTime(beforeTime)
      .limit(200);
    if (nextToken) req = req.nextToken(nextToken);
    const res = await req.do();
    for (const t of res.transactions) {
      const roundTime = Number(t.roundTime) * 1000;
      const hits = [];
      extractDeltas(t, appId, roundTime, hits);
      // fallback: use outer tx delta if extractDeltas found nothing
      if (hits.length === 0 && t.globalStateDelta) hits.push({ delta: t.globalStateDelta, time: roundTime });
      for (const { delta, time } of hits) {
        const getKey = (k) => delta.find(d => Buffer.from(d.key, "base64").toString("utf8") === k);
        const iKey = getKey("i");
        const vKey = getKey("v");
        const sKey = getKey("s");
        if (!iKey) continue;
        const interest = parseUint64s(iKey.value.bytes);
        const varBor = vKey ? parseUint64s(vKey.value.bytes) : null;
        const stblBor = sKey ? parseUint64s(sKey.value.bytes) : null;
        snapshots.push({
          time,
          totalDeposits:       Number(interest[3]) / Math.pow(10, decimals),
          totalVariableBorrow: varBor ? Number(varBor[3]) / Math.pow(10, decimals) : null,
          depositAPY:          Number(interest[4]) / 1e14,
          varBorrowAPY:        varBor ? Number(varBor[4]) / 1e14 : null,
          stblBorrowAPY:       stblBor ? Number(stblBor[9]) / 1e14 : null,
        });
      }
    }
    if (!res["next-token"]) break;
    nextToken = res["next-token"];
  }
  return snapshots;
}

async function fetchYearSnapshots(indexer, appId, decimals) {
  const allSnapshots = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const after = new Date(now);
    after.setMonth(after.getMonth() - i - 1);
    after.setDate(1); after.setHours(0, 0, 0, 0);
    const before = new Date(now);
    before.setMonth(before.getMonth() - i);
    before.setDate(1); before.setHours(0, 0, 0, 0);
    allSnapshots.push(...await fetchMonthSnapshots(indexer, appId, decimals, after.toISOString(), before.toISOString()));
  }
  // current partial month
  const lastMonth = new Date(now);
  lastMonth.setDate(1); lastMonth.setHours(0, 0, 0, 0);
  allSnapshots.push(...await fetchMonthSnapshots(indexer, appId, decimals, lastMonth.toISOString(), now.toISOString()));

  allSnapshots.sort((a, b) => a.time - b.time);

  // 1 point per day (last snapshot of the day for most accurate end-of-day value)
  const byDate = new Map();
  for (const s of allSnapshots) {
    const date = new Date(s.time).toISOString().slice(0, 10);
    byDate.set(date, s); // overwrite → keeps last (most recent) of the day
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, s]) => ({
      date,
      totalDeposits: s.totalDeposits,
      totalVariableBorrow: s.totalVariableBorrow,
      depositAPY: s.depositAPY,
      varBorrowAPY: s.varBorrowAPY,
      stblBorrowAPY: s.stblBorrowAPY,
    }));
}

const POOLS = [
  { key: "ALGO",          appId: 971368268,   decimals: 6 },
  { key: "xALGO",         appId: 2611131944,  decimals: 6 },
  { key: "tALGO",         appId: 3073474613,  decimals: 6 },
  { key: "USDC",          appId: 971372237,   decimals: 6 },
  { key: "goBTC",         appId: 971373361,   decimals: 8 },
  { key: "goETH",         appId: 971373611,   decimals: 8 },
  { key: "WBTC",          appId: 1067289273,  decimals: 8 },
  { key: "WETH",          appId: 1067289481,  decimals: 8 },
  { key: "WAVAX",         appId: 1166977433,  decimals: 8 },
  { key: "WSOL",          appId: 1166980669,  decimals: 8 },
  { key: "WLINK",         appId: 1216434571,  decimals: 8 },
  { key: "GOLD",          appId: 1258515734,  decimals: 6 },
  { key: "SILVER",        appId: 1258524099,  decimals: 6 },
  { key: "ISOLATED_ALGO", appId: 3184317016,  decimals: 6 },
  { key: "ISOLATED_USDC", appId: 3184324594,  decimals: 6 },
  { key: "ISOLATED_TINY", appId: 3184325123,  decimals: 6 },
  { key: "ISOLATED_FOLKS",appId: 3343137163,  decimals: 6 },
];

export async function GET() {
  try {
    const indexer = new Indexer("", "https://mainnet-idx.algonode.cloud", 443);
    const results = {};
    for (const pool of POOLS) {
      results[pool.key] = await fetchYearSnapshots(indexer, pool.appId, pool.decimals);
    }
    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
