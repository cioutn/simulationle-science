# SimulationLE / Science

收录医学、热学、生物学、材料学、天文学、化学和神经科学共七个案例。

首页可以按学科和软件查找案例，比较科学问题和预期交付。详情页提供任务概览和页内目录，按任务步骤、输入来源、可切换的示意图和预期交付展开。

## 本地预览

编辑 `content/cases.json` 后，在仓库根目录运行 `python3 scripts/build_catalog.py` 生成首页和各个详情页。运行 `python3 scripts/build_catalog.py --check` 核对生成的页面。

运行 `python3 -m http.server 8000`，打开 [localhost:8000](http://localhost:8000/)。独立详情页位于 `cases/`，共享样式、图表和交互脚本位于 `assets/`。

## 发布

[GitHub Pages](https://cioutn.github.io/simulationle-science/) 从 `main` 分支的根目录部署。
