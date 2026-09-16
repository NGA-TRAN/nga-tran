---
title: Optimizing queries in InfluxDB 3 using progressive evaluation
description: Which SQL qualifies for ProgressiveEvalExec, how to see it in EXPLAIN, and how mixed overlapping files are still evaluated newest-first.
pubDate: 2024-11-14
type: essay
tags:
  - InfluxDB
  - Query Planning
  - DataFusion
---

I first published this on the [InfluxData blog](https://www.influxdata.com/blog/query-optimization-progressive-evaluation-influxdb/) with Reid Kaufmann.
