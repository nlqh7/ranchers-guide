/* GENERATED from data/fs25/production.json — do not edit manually. */
(function () {
  "use strict";
  var SOURCE_DATA = {
  "schemaVersion": "fs25-bread-v1",
  "game": {
    "id": "fs25",
    "name": "Farming Simulator 25",
    "shortName": "FS25",
    "status": "pilot"
  },
  "chain": {
    "id": "bread",
    "name": "Bread",
    "zhName": "面包",
    "unit": "L",
    "steps": [
      {
        "id": "bakery",
        "facility": "Bakery",
        "zhFacility": "面包房",
        "inputId": "flour",
        "inputPerOutput": {
          "value": 2,
          "unit": "L flour / L bread",
          "zhUnit": "L 面粉 / L 面包",
          "status": "community-reference",
          "sourceId": "productions-guide-v143",
          "runtimeConfirmed": false,
          "evidence": {
            "sourceRow": 3,
            "facilityVariant": "standard-not-shed",
            "gameBuild": null,
            "inputPerCycle": 90,
            "outputPerCycle": 45
          },
          "note": "Author sheet v1.4.3, standard Bakery flour recipe, row 3: 90 / 45.",
          "zhNote": "作者表 v1.4.3 普通面包房面粉配方，第3行：90÷45；不含棚屋版。"
        },
        "outputCapacityPerMonth": {
          "value": 5400,
          "unit": "L bread / production month",
          "zhUnit": "L 面包 / 生产运行月",
          "status": "community-reference",
          "sourceId": "productions-guide-v143",
          "runtimeConfirmed": false,
          "evidence": {
            "sourceRow": 3,
            "facilityVariant": "standard-not-shed",
            "gameBuild": null,
            "cyclesPerMonth": 120,
            "outputPerCycle": 45
          },
          "note": "Same historical Bakery row: 120 cycles/month × 45 L output. Current game build unspecified.",
          "zhNote": "同一历史普通面包房行：每月120轮×每轮45 L；游戏版本未注明。"
        },
        "sharingRule": {
          "default": "divided",
          "status": "sample-assumption",
          "editable": true,
          "note": "Facility-specific rule is not runtime-confirmed in this pilot.",
          "zhNote": "设施级共享规则尚未在本试点中实机确认。"
        }
      },
      {
        "id": "mill",
        "facility": "Grain Mill",
        "zhFacility": "谷物磨坊",
        "inputId": "wheat",
        "inputPerOutput": {
          "value": 1.25,
          "unit": "L wheat / L flour",
          "zhUnit": "L 小麦 / L 面粉",
          "status": "community-reference",
          "sourceId": "productions-guide-v143",
          "runtimeConfirmed": false,
          "evidence": {
            "sourceRow": 24,
            "facilityVariant": "standard-not-shed",
            "gameBuild": null,
            "inputPerCycle": 5,
            "outputPerCycle": 4
          },
          "note": "Author sheet v1.4.3, standard Grain Mill wheat recipe, row 24: 5 / 4.",
          "zhNote": "作者表 v1.4.3 普通谷物磨坊小麦配方，第24行：5÷4；不含棚屋版。"
        },
        "outputCapacityPerMonth": {
          "value": 10080,
          "unit": "L flour / production month",
          "zhUnit": "L 面粉 / 生产运行月",
          "status": "community-reference",
          "sourceId": "productions-guide-v143",
          "runtimeConfirmed": false,
          "evidence": {
            "sourceRow": 24,
            "facilityVariant": "standard-not-shed",
            "gameBuild": null,
            "cyclesPerMonth": 2520,
            "outputPerCycle": 4
          },
          "note": "Same historical Grain Mill row: 2520 cycles/month × 4 L output. Check your own facility.",
          "zhNote": "同一历史普通磨坊行：每月2520轮×每轮4 L；请核对自己的设施。"
        },
        "sharingRule": {
          "default": "divided",
          "status": "sample-assumption",
          "editable": true,
          "note": "Some community reports describe facility-specific parallel lines; this pilot does not confirm the current rule.",
          "zhNote": "社区资料显示不同设施可能有不同并行规则；本试点未确认当前规则。"
        }
      }
    ],
    "crop": {
      "id": "wheat",
      "name": "Wheat",
      "zhName": "小麦",
      "yieldPerHaPerHarvest": {
        "value": 11800,
        "unit": "L / ha / harvest",
        "zhUnit": "L / 公顷 / 每次收获",
        "status": "sample-assumption",
        "runtimeConfirmed": false,
        "sourceId": null,
        "evidenceScope": "No direct source supports 11,800 L/ha/harvest. The retained crop sheet reports 12.68 m³ under its own 1 ha and 42.50% growth-bonus conditions; it is not a universal current-build yield.",
        "zhEvidenceScope": "没有直接来源支持每公顷每次收获 11,800 L。保留的作物表只在自身的 1 公顷、42.50% 生长加成条件下记录 12.68 m³；不能当作当前版本通用产量。",
        "note": "Illustrative planner default only; edit it for the player's map, settings or observed yield. It is not source-checked.",
        "zhNote": "仅作为规划器示例默认值；请按地图、设置或玩家实测修改，未经过来源核实。"
      }
    }
  },
  "assumptions": {
    "productionRunMonthsPerYear": {
      "default": 12,
      "min": 1,
      "max": 12,
      "unit": "months / year",
      "zhUnit": "月 / 年",
      "label": "Production run months per year",
      "zhLabel": "每年生产运行月数"
    },
    "harvestsPerYear": {
      "default": 1,
      "min": 1,
      "max": 12,
      "unit": "harvests / year",
      "zhUnit": "次收获 / 年",
      "label": "Wheat harvests per year",
      "zhLabel": "小麦每年收获次数"
    }
  },
  "sources": [
    {
      "id": "productions-guide-v143",
      "label": "MrSNoopy1611: FS 25 Productions Guide v1.4.3 — standard Bakery / Grain Mill",
      "zhLabel": "MrSNoopy1611：生产表 v1.4.3——普通面包房／谷物磨坊",
      "url": "https://docs.google.com/spreadsheets/d/1KBP3QLKgKboofOCFQnM2gedq75pu7ugzm960FQDb3EM/edit#gid=363485587",
      "authorPostUrl": "https://www.reddit.com/r/farmingsimulator/comments/1h7h7nw/fs25_production_profitability_v14_finally_here/",
      "edition": "1.4.3",
      "checkedAt": "2026-10-20",
      "role": "reference",
      "note": "Productions (easy), rows 3 and 24, left-hand standard facilities; excludes shed columns. Historical, game build unspecified.",
      "zhNote": "Productions (easy) 第3、24行左侧普通设施，不含右侧棚屋版；历史参考，游戏版本未注明。"
    },
    {
      "id": "grain-mill-community-thread",
      "label": "Community discussion: Grain mill input",
      "zhLabel": "社区讨论：谷物磨坊投入",
      "url": "https://www.reddit.com/r/farmingsimulator/comments/1hms4yf/grain_mill_input/",
      "role": "reference",
      "note": "Community report; not a current-build runtime confirmation.",
      "zhNote": "社区报告；不是当前版本实机确认。"
    },
    {
      "id": "crop-yield-community-sheet",
      "label": "Community crop prices and yields sheet",
      "zhLabel": "社区作物价格与产量表",
      "url": "https://www.reddit.com/r/farmingsimulator/comments/1ll8r8l/fs25_crop_prices_and_yields_v10/",
      "role": "reference",
      "note": "Reference sheet; author stated a public-domain release for that work, not for game assets.",
      "zhNote": "参考表；作者声明该作品为公有领域，不代表游戏资产授权。"
    },
    {
      "id": "production-point-docs",
      "label": "GIANTS Developer Network: production point scripting reference",
      "zhLabel": "GIANTS Developer Network：生产点脚本参考",
      "url": "https://gdn.giants-software.com/documentation_scripting_fs25.php?category=1&class=102&version=script",
      "role": "boundary",
      "note": "Documents the production-point concept; it does not confirm these specific bread-chain values.",
      "zhNote": "说明生产点概念；不确认本条面包链的具体数值。"
    }
  ],
  "fixtures": [
    {
      "id": "default-example-5400",
      "targetBreadPerMonth": 5400,
      "expected": {
        "flourPerMonth": 10800,
        "wheatPerMonth": 13500,
        "bakeryCount": 1,
        "millCount": 2,
        "areaHaAt12Months1Harvest": 13.7
      },
      "note": "Mathematical regression fixture only; not a claim about a universal current-build setup.",
      "zhNote": "仅用于数学回归；不代表当前版本所有存档都适用。"
    }
  ]
};
  var bakery = SOURCE_DATA.chain.steps[0];
  var mill = SOURCE_DATA.chain.steps[1];
  var CHAIN = {
    product: { id: SOURCE_DATA.chain.id, name: SOURCE_DATA.chain.name, zhName: SOURCE_DATA.chain.zhName, unit: SOURCE_DATA.chain.unit },
    steps: [
      {
        id: bakery.id,
        facility: bakery.facility,
        zhFacility: bakery.zhFacility,
        inputId: bakery.inputId,
        inputPerOutput: bakery.inputPerOutput.value,
        inputPerOutputMeta: bakery.inputPerOutput,
        outputCapacityPerMonth: bakery.outputCapacityPerMonth.value,
        outputCapacityMeta: bakery.outputCapacityPerMonth,
        sharingRule: bakery.sharingRule.default,
        sharingRuleMeta: bakery.sharingRule
      },
      {
        id: mill.id,
        facility: mill.facility,
        zhFacility: mill.zhFacility,
        inputId: mill.inputId,
        inputPerOutput: mill.inputPerOutput.value,
        inputPerOutputMeta: mill.inputPerOutput,
        outputCapacityPerMonth: mill.outputCapacityPerMonth.value,
        outputCapacityMeta: mill.outputCapacityPerMonth,
        sharingRule: mill.sharingRule.default,
        sharingRuleMeta: mill.sharingRule
      }
    ],
    crop: {
      id: SOURCE_DATA.chain.crop.id,
      name: SOURCE_DATA.chain.crop.name,
      zhName: SOURCE_DATA.chain.crop.zhName,
      yieldPerHa: SOURCE_DATA.chain.crop.yieldPerHaPerHarvest.value,
      yieldMeta: SOURCE_DATA.chain.crop.yieldPerHaPerHarvest
    }
  };

  function finiteProduct(a, b) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    var result = a * b;
    return Number.isFinite(result) ? result : null;
  }

  function litersNeeded(ratios, targetPerMonth) {
    var flourPerMonth = finiteProduct(targetPerMonth, ratios.flourPerBread);
    var wheatPerMonth = finiteProduct(flourPerMonth, ratios.wheatPerFlour);
    return { flourPerMonth: flourPerMonth, wheatPerMonth: wheatPerMonth };
  }

  function effectiveCapacity(capacityPerMonth, lines, rule) {
    if (!Number.isFinite(capacityPerMonth) || !(capacityPerMonth > 0) ||
      !Number.isInteger(lines) || lines < 1 || !["independent", "divided"].includes(rule)) return null;
    if (rule === "independent") return capacityPerMonth;
    return capacityPerMonth / Math.max(1, lines);
  }

  function facilitiesNeeded(throughputPerMonth, capacityPerMonth, lines, rule) {
    var effective = effectiveCapacity(capacityPerMonth, lines, rule);
    if (!Number.isFinite(throughputPerMonth) || throughputPerMonth < 0 || !(effective > 0)) return null;
    var count = Math.ceil(throughputPerMonth / effective);
    var totalCapacity = finiteProduct(count, effective);
    if (!Number.isFinite(count) || totalCapacity === null) return null;
    return {
      count: count,
      effective: effective,
      shortfall: Math.max(0, throughputPerMonth - effective),
      singleFacilityShort: throughputPerMonth > effective,
      headroom: Math.max(0, totalCapacity - throughputPerMonth)
    };
  }

  function facilityPlan(throughputPerMonth, capacityPerMonth, lines, rule, existingCount) {
    if (existingCount !== null && existingCount !== undefined &&
      (!Number.isFinite(existingCount) || existingCount < 0 || existingCount % 1 !== 0)) return null;
    var plan = facilitiesNeeded(throughputPerMonth, capacityPerMonth, lines, rule);
    if (!plan) return null;
    var hasExisting = existingCount !== null && existingCount !== undefined;
    var currentCapacity = hasExisting ? finiteProduct(existingCount, plan.effective) : null;
    if (hasExisting && currentCapacity === null) return null;
    return {
      totalNeeded: plan.count,
      effective: plan.effective,
      additionalNeeded: hasExisting ? Math.max(0, plan.count - existingCount) : null,
      shortfall: hasExisting ? Math.max(0, throughputPerMonth - currentCapacity) : null,
      existingCount: hasExisting ? existingCount : null,
      headroom: plan.headroom
    };
  }

  function areaHa(wheatPerMonth, runMonths, yieldPerHa, harvestsPerYear) {
    if (!(yieldPerHa > 0) || !(runMonths > 0) || !(harvestsPerYear > 0)) return null;
    var annualDemand = finiteProduct(wheatPerMonth, runMonths);
    var annualYield = finiteProduct(yieldPerHa, harvestsPerYear);
    if (annualDemand === null || annualYield === null || !(annualYield > 0)) return null;
    var area = annualDemand / annualYield;
    return Number.isFinite(area) ? area : null;
  }

  var api = {
    SOURCE_DATA: SOURCE_DATA,
    CHAIN: CHAIN,
    finiteProduct: finiteProduct,
    litersNeeded: litersNeeded,
    effectiveCapacity: effectiveCapacity,
    facilitiesNeeded: facilitiesNeeded,
    facilityPlan: facilityPlan,
    areaHa: areaHa
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.FS25PlannerData = api;
})();
