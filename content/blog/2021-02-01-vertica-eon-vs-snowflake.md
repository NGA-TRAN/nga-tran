---
title: "Distributed cloud columnar databases: Vertica Eon vs Snowflake"
description: How Vertica Eon and Snowflake both separate storage from compute — and where their architectures, caches, and scaling models diverge.
pubDate: 2021-02-01
type: essay
tags:
  - Vertica
  - Snowflake
  - Architecture
---

I first published this in February 2021 as [Distributed Cloud Columnar Databases: Vertica Eon vs Snowflake](https://github.com/NGA-TRAN/Blogs/blob/main/distributed_databases/vertica_snowflake.md). This is that text.

This post compares two successful databases, **Vertica** and **Snowflake**, focusing on their major offerings and internal implementations. The main comparisons are based on these technical materials — [Vertica](https://vldb.org/pvldb/vol5/p1790_andrewlamb_vldb2012.pdf), [Vertica Eon](https://www.vertica.com/wp-content/uploads/2018/05/Vertica_EON_SIGMOD_Paper.pdf), [Vertica Eon Talk 2020](https://www.thecube.net/vertica-bigdata-2020/content/Videos/GGE42drgkAHfYoFbn), [Snowflake](https://pages.cs.wisc.edu/~remzi/Classes/739/Fall2018/Papers/p215-dageville-snowflake.pdf), [Snowflake Architecture Talk 2019](https://www.youtube.com/watch?v=dxrEHqMFUWI), and [Snowflake Talk at CIDR 2021](https://www.youtube.com/watch?v=0K7h7WvC6D4) — but many other related ones will be mentioned or cited throughout. The content is from my sole understanding of the materials and may miss some key designs.

**In short:** being a distributed cloud RDBMS[^1] that can scale compute up (more powerful nodes) and out (more nodes) while maintaining strong consistency and availability makes Vertica’s and Snowflake’s offerings unusual. The rest of this post goes into the details.

## Similarities

Vertica and Snowflake provide similar *cloud databases* that support separation of *storage* and *compute*. Their data and metadata are shared and stored persistently on durable, available storage such as Amazon S3, and their compute clusters are formed elastically on demand to write and read that shared storage.

Their cloud databases are *distributed RDBMSs* running *SQL* on an MPP (massively parallel processing) platform that complies with *ACID* transactions and allows *fault tolerance*, *self-recoveries*, and *self-backups*. Although both work well for writing and reading, they are referred to as data warehouses because of their focus on *OLAP*, where reads happen a lot more often than writes, and therefore leverage *column store*[^col] technologies in their table storage designs.

Both are designed to support *historical queries* that can access deleted data.[^hist] This is possible because data files are immutable after they are first written. A `DELETE` is just a new write that stores the positions of deleting tuples, and at `SELECT` time that brief information is used to eliminate deleted rows before returning results. An `UPDATE` is a `DELETE` followed by an `INSERT`. They also provide zero-copy clones of tables in SQL[^clone] that duplicate table data for users without copying anything. Persistent data is immutable: both old and new tables use the same files from before the clone time, and modifications after that are managed by each table’s metadata separately.

Both companies see the popularity of *semi-structured* data (JSON, XML, Avro) that needs a non-traditional ELT (extract, load, and transform)[^2] workload, and offer features to load semi-structured data first and, when needed, discover and transform the structured part automatically or through UDFs for better query performance.[^semi]

As cloud DB providers, they continue building *security* features such as authentication, authorization, and encryption in flight and at rest.[^sec]

The ecosystems of both are diverse: Kafka for streaming,[^kafka] Spark connectors,[^spark] SDKs for different languages,[^sdk] driver connectors,[^drv] and BI integration.[^bi] I will not dive into those details, but [Snowflake’s Best Practice for Data Engineers](https://www.youtube.com/watch?v=E--zIGd_iqE) and [Vertica’s Coolest Features](https://www.youtube.com/watch?v=ezD5we-cens) summarize those offerings well.

Here are a few key technologies of their internal implementations:

- ACID transactions are handled via snapshot isolation and MVCC. Queries in a transaction only see a snapshot of immutable data files at the time the transaction started, and a copy of every committed metadata or data change is preserved for some duration.
- Columns are not only organized separately but also sorted and encoded,[^3] which is key for fast scan and efficient execution. Partitioning tables horizontally and keeping column-partition min and max values lets the execution engine scan only partitions that include needed data.
- Query plans use many obvious heuristics, but the non-obvious factors are costed, compared, and pruned by a cost model using data statistics. Predicates and aggregation operators are pushed down under joins to prune data as early as possible. The execution engine evaluates those push-down operators while running them and disables them as soon as it discovers no benefit — they may even regress performance.[^opt]
- Join SIP (sideways information passing) and transitive predicates prune unnecessary join data at scan time, well before the join happens.[^sip]
- Even though most optimizations are performed in the query optimizer, a few are decided on the fly at execution time.
- Queries are executed in a vectorized, pipelined fashion to improve cache efficiency and avoid storing intermediate results. Column data is kept in its encoding format as long in the plan as possible.
- Execution counters are logged for every executed operator so they can be compared with estimates and used for plan diagnosis. When needed, there are techniques to reproduce customer query plans in-house without their metadata or statistics.
- Tests are critical in distributed, multi-tenant databases. At a high level they fall into:
  - **Unit tests** tightly coupled to specific features.
  - **Functional tests** that integrate SQL clauses into sophisticated queries.
  - **Stress tests** that simulate highly distributed, multi-tenant systems and intensive conflicting workloads — for example one user deleting data another is using.[^stress]
  - **Scaling tests** that add or remove nodes and change cache size.
  - **Performance tests** that measure specific workloads on various cluster configurations.
  - **Regression tests** for each category above.

## Differences

Vertica offers both a *cloud* DB (Eon mode) and an *on-premise* DB (Enterprise mode). Snowflake is a *DBaaS* and only offers the cloud option. Snowflake focuses on **easy-to-use** and makes everything simple: users pick general needs and Snowflake provides suitable configurations. Vertica focuses on **query performance** and lets users optimize clusters and storage as needed. Each comparison below is marked **[S]** or **[V]** to emphasize who is more mature, Snowflake or Vertica respectively.

**[S]** As a **DBaaS**, Snowflake provides a friendly UI for almost all actions: setting up clusters, loading data, running queries, monitoring processes, and reporting results.[^sui] The UI also covers collaboration, query-plan debugging, feedback, and support. At the time of this writing, Vertica is not yet a DBaaS but does provide self-management such as [ElasticDW](https://elasticdw.com) and works with UIs such as DBVisualizer and its own Management Console.[^vui]

**[S]** Snowflake’s architecture has three layers — **operation service** (cloud service), **execution compute** (virtual warehouse), and **storage** — a smart split of the three major pieces of an elastic, multi-tenant cluster. Operation includes metadata and transaction management, cluster infrastructure, the query optimizer, security, and collaboration and data sharing. Vertica Cloud DB evolved from the on-premise system and implements two layers: **operation and execution**, and **storage**. Coupling operation and execution works best for a shared-nothing on-premise system, but a cloud DB needs a center point to manage the whole cluster. Vertica’s turnaround was to use one sub-cluster (equivalent to Snowflake’s VW) as a primary that both runs queries and is responsible for cluster operation. That is a solid intermediate path toward splitting operation from execution. To the best of my knowledge of Vertica internals, those designs are not tightly coupled, and splitting them would not take much effort.

Caching is interesting in both:

- **[S]** At the operation-service layer, Snowflake maintains a *hot cache* of query *results* for a configurable period, usually 24 hours. If the same or a different user runs that same query again and the optimizer sees that the participating partitions are unchanged, the cached results are returned immediately. This is useful in a collaborative workplace where many users look for the same reports.[^hot]
- **[V]** At the execution-compute layer, both offer a *warm cache* on local disks to avoid reading from a slow object store such as S3. In Snowflake this cache is hidden, only captures data of recently run queries, and disappears when the compute is suspended. In Vertica this cache is the **depot**: users can specify size, caching policy, and whether it persists after compute is shut down.[^depot] A node with an empty depot can accept queries, but the depot is usually filled to resemble its peers right after it joins, before running queries. The depot lets heavy-I/O queries run several times faster — important for customers who have only a few hours after midnight to produce heavy-duty reports.

**[V]** Both store a table as a set of separate column files in certain sort orders and encodings, but table design in Vertica goes further. A Vertica table is only logical. Physical storage is one or more **projections**, each sorted and encoded differently for different queries. Projections are designed automatically by Vertica DBDesigner[^dbd] from the customer’s data, query workload, and storage budget. When a query is issued, the optimizer selects the best set of projections. That customization of storage for a specific workload is a unique Vertica offer.

Compute is a key component, and both have advantages. A compute is a *set of nodes* that run many tasks of a query in parallel, many queries in parallel, or both. Snowflake calls this a **VW** (virtual warehouse); Vertica calls it a **sub-cluster**. Isolated workloads do not talk to peer VWs or sub-clusters, so they can be added or removed to achieve linear throughput scaling — the number of queries finished in a second or minute.[^thru] So what differs?

- **[S]** Because Snowflake splits operation from execution, a node can be added to a VW while a query is running and can share that query’s work immediately. That is **elastic crunch scaling**: scaling a query’s runtime by adding or removing nodes. Adding a node in Vertica is a bit slower because of operation overhead, and the new node cannot join already-running queries, either because of how the plan is built or how a sub-cluster is designed. Vertica does offer elastic crunch scaling automatically when the number of nodes in the sub-cluster is a multiple of the shard count.[^crunch]
- **[V]** Vertica sub-cluster size can be flexible, but common practice is to match or multiple the **number of shards**, which defines the **degree of inter-node parallelism**. Data of large projections is horizontally segmented on a specified column (or set of columns) into that many shards. Segmented columns of different tables that land on the same shard have the same value range. If those columns are joined or grouped, execution is fast because the data is already co-located — no transfer between nodes.[^seg] That is another unique Vertica design aimed at query performance.
- **[S or V?]** Both offer almost-linear elastic throughput scaling. Vertica’s segment shards push query performance but restrict crunch scaling. Snowflake has no segment-shard design for complicated queries, but it benefits from immediate crunch scaling. I am curious whether Snowflake’s crunch scaling reaches and then passes Vertica’s segment-shard performance, or saturates before that.

**[V]** Snowflake offers a single mode: a pure cloud DB with separation of storage and compute, on Amazon AWS, Microsoft Azure, and Google Cloud. Vertica offers three modes:

1. **Vertica Eon mode on cloud** — closest to Snowflake. The comparisons so far are on this mode. At the time of writing it works on Amazon AWS and Google Cloud Platform.
2. **Vertica Eon mode on-premise** — the same separation of storage and compute, but compute and storage do not have to be on public clouds. Compute can be any cluster the customer chooses; storage can be Pure Storage FlashBlade, MinIO, or HDFS.[^eonprem]
3. **Vertica on-premise** — the original shared-nothing distributed data warehouse, installable on a customer cluster or on AWS, Azure, or GCP. Because it is shared-nothing, each node needs both compute (CPU and RAM) and enough disk for persistent data.

**[S]** Collaboration across accounts is a key Snowflake offer: **Secure Database Sharing**, a producer–consumer model without copying data. The producer creates sharing metadata for what to share and who may consume it; consumers create corresponding metadata to access the shareable objects, then can join that data with their own.[^share] To my knowledge this is not available in Vertica at this time.

**[V]** Besides integrating with AI and ML tools, Vertica offers in-database ML: ML functions written in SQL and executed like any Vertica query, with the calculations in the data pipeline.[^ml] There is no need to export and reimport data. Snowflake does not have this yet, though the CIDR 2021 talk linked above suggests they are working on similar capabilities.

**[V]** Vertica offers more mature types such as complex types and time series, and diverse materialized views such as flattened tables and live aggregate projections.[^types] Snowflake, however, can `UNDROP` a table within 24 hours of it being dropped.

**[S]** Snowflake continues scaling its operation / cloud-service layer to manage a single cluster of unlimited VWs — a **global data mesh** that supports global communication and parallel data movement for tasks such as cross-region replication.

A few other internal differences:

- **[S or V?]** Snowflake’s physical storage is hybrid columnar. A **micro-partition** is a file of many columns; the file header points to the start of each column’s data. Vertica’s physical storage is purely columnar. Each column is stored in its own file and *virtually* grouped into a **container**, equivalent to a Snowflake micro-partition. In this writing, *partition* means Snowflake’s micro-partition or Vertica’s container.
- Snowflake stores partition metadata (min, max, count, null count, distinct count) at the operation-service layer, and the optimizer uses it to prune partitions. Vertica’s equivalent is **ValIndex**, and the optimizer knows nothing about it. The plan does not name partitions to execute; it only keeps predicate expressions. Execution prunes partitions from those expressions. That follows from splitting operation from execution in Snowflake:
  - **[V]** If pruning happens in the optimizer, the plan has to carry partition IDs. Physical execution is better parallelized and multi-threaded than the optimizer’s logical plan, so pruning at execution is more efficient.
  - **[S]** If the optimizer knows partition metadata, plan statistics are more accurate. The optimizer can also see early whether results are cached and skip the rerun.
  - Combining both — prune in the optimizer *and* in execution — would be optimal. Another difference can be combined too. Snowflake’s optimizer appears to use partition metadata as its statistics. Vertica’s optimizer does not; it builds a 100-bucket histogram from random samples of the actual data, each bucket carrying the same kind of metadata as a partition. If there are more partitions than histogram buckets, the actual partition metadata is more accurate; if there are only a few partitions on a large, well-encoded set, the histogram is finer-grained. I would build a histogram from partition metadata first, and if the partition count is small, refine it with random samples.
- **[V]** When non-co-located data of a join or group-by must be redistributed, Snowflake lets execution decide when. Vertica decides at planning time before sending the plan to execution. That follows from Vertica’s segment shards; Snowflake does not have that design.
- Query profiles[^prof] are worth comparing:
  - **[S]** Snowflake provides a Web UI for query profiles.
  - **[V]** Vertica has a robust monitoring schema for every profile detail.
  - Combining the two — rich profile data in an easy-to-navigate UI — would be the right offer.
- **[S or V?]** A well-known optimizer issue is that the “optimal” generated plan is sometimes far from optimal. Snowflake appears to offer a drag-and-drop way in the Web UI to reconstruct a bad customer plan; I have not found documentation or demos. Vertica provides **Directed Query**,[^dq] which can rebuild the details of any plan — to retain plans after an upgrade, or to build one by hand. I cannot compare the two fairly, but I would suggest a UI for Vertica’s Directed Query. Neither vendor recommends customers building their own plans over the optimizer’s.
- **[S or V?]** Vertica builds the query plan *bottom-up*; Snowflake builds it *top-down*. Both are well-known techniques with their own advantages.
- **[V]** Snowflake uses a *push* strategy to pipeline data in a plan. Vertica implemented push first, then converted to *pull* for better performance and resource sharing.
- **[S or V?]** Snowflake stores metadata in a key-value store, FoundationDB. Vertica implements its own format and storage.

## Rumors

This writing is meant to stay on offerings and internals. Readers have still asked about cost, pricing, and performance per dollar. I have not spent much time on that, but I have heard from reliable sources that Vertica outperforms Snowflake given equivalent compute, and that for a given solution Snowflake turns out far more expensive. Snowflake is much easier to start with and more turn-key, with less need for on-site expertise. Do your own research — and POCs with both on your workloads, with exact quotes.

## Afterword

If you are looking for a cloud DB, which of these fits your needs? If you are building a DB, which technologies and offerings would you pick?

[^1]: Vertica and Snowflake support defining and maintaining constraints such as primary and foreign keys, but only a few are enforced automatically. See [Snowflake constraints](https://docs.snowflake.com/en/sql-reference/constraints.html) and [Vertica constraints](https://www.vertica.com/docs/9.2.x/HTML/Content/Authoring/AdministratorsGuide/Constraints/AboutConstraints.htm) for how to enforce the rest.

[^2]: ELT extracts and loads semi-structured data before transformations run inside the database. Traditional ETL transforms before load.

[^3]: Common column encodings include RLE (run-length encoding), delta value, delta range, and block dictionary. See [C-Store](https://web.archive.org/web/20100619191833/http://db.lcs.mit.edu/projects/cstore/vldb.pdf) and the [Vertica paper](https://vldb.org/pvldb/vol5/p1790_andrewlamb_vldb2012.pdf).

[^col]: [Column-store technologies](https://web.archive.org/web/20100619191833/http://db.lcs.mit.edu/projects/cstore/vldb.pdf).

[^hist]: Historical queries in [Snowflake](https://docs.snowflake.com/en/sql-reference/constructs/at-before.html) and [Vertica](https://www.vertica.com/docs/10.0.x/HTML/Content/Authoring/AnalyzingData/Queries/HistoricalSnapshotQueries.htm).

[^clone]: Zero-copy clones in [Snowflake](https://docs.snowflake.com/en/sql-reference/sql/create-clone.html) and [Vertica](https://www.vertica.com/docs/10.0.x/HTML/Content/Authoring/SQLReferenceManual/Functions/VerticaFunctions/COPY_TABLE.htm) (`COPY TABLE`).

[^semi]: Semi-structured data in [Snowflake](https://docs.snowflake.com/en/user-guide/semistructured-concepts.html) and [Vertica](https://www.vertica.com/docs/9.2.x/HTML/Content/Authoring/FlexTables/FlexTableHandbook.htm) (Flex Tables).

[^sec]: Security in [Snowflake](https://docs.snowflake.com/en/user-guide-admin-security.html) and [Vertica](https://www.vertica.com/docs/9.2.x/HTML/Content/Authoring/Security/ImplementingSecurity.htm), plus [Vertica Voltage](https://www.vertica.com/docs/9.2.x/HTML/Content/Authoring/VoltageIntegration/IntegratingWithVoltageSecureData.htm). Talk: [Vertica end-to-end security](https://www.thecube.net/vertica-bigdata-2020/content/Videos/7zL6tG5oFjM5gesaa).

[^kafka]: Kafka streaming in [Snowflake](https://docs.snowflake.com/en/user-guide/kafka-connector.html) and [Vertica](https://www.vertica.com/docs/10.0.x/HTML/Content/Authoring/KafkaIntegrationGuide/KafkaIntegrationGuide.htm).

[^spark]: Spark connectors in [Snowflake](https://docs.snowflake.com/en/user-guide/spark-connector.html) and [Vertica](https://www.vertica.com/docs/10.0.x/HTML/Content/Authoring/SparkConnector/ApacheSparkGuide.htm).

[^sdk]: [Snowflake Python connector](https://docs.snowflake.com/en/user-guide/python-connector.html); Vertica [C++](https://www.vertica.com/docs/10.0.x/HTML/Content/Resources/VerticaResources/CppSDKDoc.htm), [Java](https://www.vertica.com/docs/10.0.x/HTML/Content/Resources/VerticaResources/JavaSDKDoc.htm), [Python](https://www.vertica.com/docs/10.0.x/HTML/Content/Resources/VerticaResources/PythonSDKDoc.htm), and [R](https://www.vertica.com/docs/10.0.x/HTML/Content/Authoring/R-SDK/OverviewRSDK.htm) SDKs.

[^drv]: Drivers in [Snowflake](https://docs.snowflake.com/en/user-guide/conns-drivers.html) and [Vertica](https://www.vertica.com/docs/9.2.x/HTML/Content/Authoring/ConnectingToVertica/ConnectingToVertica.htm).

[^bi]: BI partners for [Snowflake](https://docs.snowflake.com/en/user-guide/ecosystem-bi.html) and [Vertica](https://www.vertica.com/partners/filter/technology-partners/).

[^opt]: [The Vertica Query Optimizer](https://www.researchgate.net/publication/269306314_The_Vertica_Query_Optimizer_The_case_for_specialized_query_optimizers). Talk: [Snowflake query optimizer](https://www.youtube.com/watch?v=CPWn1SZUZqE).

[^sip]: [Vertica SIPS](https://15721.courses.cs.cmu.edu/spring2019/papers/15-execution/shrinivas-icde2013.pdf).

[^stress]: Talk: [Snowflake stress tests](https://www.youtube.com/watch?v=OJb8A6h9jQQ).

[^sui]: Demo: [Snowflake UI](https://www.youtube.com/watch?v=WU3oGByPatU).

[^vui]: Demo: [Vertica ElasticDW](https://www.youtube.com/watch?v=t5aUxP_eeYk).

[^hot]: [Caching in Snowflake](https://www.analytics.today/blog/caching-in-snowflake-data-warehouse). Demo: [Snowflake hot cache](https://www.youtube.com/watch?v=lcO8CRT5EMc).

[^depot]: [Vertica depot management](https://www.vertica.com/docs/10.0.x/HTML/Content/Authoring/Eon/Depot/DepotManagement.htm).

[^dbd]: [Vertica DBDesigner](https://ieeexplore.ieee.org/document/6816725). Talk: [Vertica DBD](https://www.thecube.net/vertica-bigdata-2020/content/Videos/Y4ckvNyeoQAZBoBSQ).

[^thru]: Elastic throughput scaling in [Snowflake](https://docs.snowflake.com/en/user-guide/warehouses-multicluster.html) and [Vertica](https://www.vertica.com/docs/10.0.x/HTML/Content/Authoring/Eon/ImprovingQueryThroughput.htm).

[^crunch]: [Vertica elastic crunch scaling](https://www.vertica.com/docs/10.0.x/HTML/Content/Authoring/Eon/UsingECS.htm).

[^seg]: [Avoiding resegmentation during joins](https://www.vertica.com/docs/10.0.x/HTML/Content/Authoring/AnalyzingData/Optimizations/AvoidingResegmentationDuringJoins.htm), [hash segmentation](https://www.vertica.com/docs/10.0.x/HTML/Content/Authoring/SQLReferenceManual/Statements/hash-segmentation-clause.htm), and [projection segmentation](https://www.vertica.com/docs/10.0.x/HTML/Content/Authoring/ConceptsGuide/Components/ProjectionSegmentation.htm).

[^eonprem]: [Vertica Eon communal storage platforms](https://www.vertica.com/docs/10.0.x/HTML/Content/Authoring/SupportedPlatforms/EonModeCommunalStoragePlatforms.htm).

[^share]: [Snowflake data sharing](https://docs.snowflake.com/en/user-guide-data-share.html).

[^ml]: [Vertica in-database machine learning](https://www.vertica.com/docs/10.0.x/HTML/Content/Authoring/AnalyzingData/MachineLearning/MachineLearning.htm). Demo: [Vertica in-DB ML](https://www.youtube.com/watch?v=4JDyvQjCXUY).

[^types]: [Analyzing data in Vertica](https://www.vertica.com/docs/10.0.x/HTML/Content/Authoring/AnalyzingData/AnalyzingData.htm) (flattened tables, live aggregate projections, time series) and [complex types](https://www.vertica.com/docs/10.0.x/HTML/Content/Authoring/SQLReferenceManual/DataTypes/ExternalTypes.htm).

[^prof]: Query profiling in [Snowflake](https://docs.snowflake.com/en/user-guide/ui-query-profile.html) and [Vertica](https://www.vertica.com/docs/10.0.x/HTML/Content/Authoring/SQLReferenceManual/SystemTables/MONITOR/V_MONITORSchema.htm).

[^dq]: [Vertica Directed Queries](https://www.vertica.com/docs/10.0.x/HTML/Content/Authoring/AdministratorsGuide/QueryManagement/DirectedQueries/DirectedQueries.htm).
