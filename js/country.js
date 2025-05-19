const countryCode =
  new URLSearchParams(window.location.search).get("code") || "USA";
document.getElementById("countryCode").textContent = countryCode;
document.getElementById("yearSlider").addEventListener("input", drawChart);

document.getElementById("playBtn").addEventListener("click", () => {
  drawChart(true);
});

const xSel = document.getElementById("x-select");
const ySel = document.getElementById("y-select");

const files = {
  temperature: "data/monthly-temperature-anomalies.csv",
  wheat: "data/wheat-yield.csv",
  gdp: "data/API_NY.GDP.MKTP.KD.ZG_DS2_en_csv_v2_85160.csv",
  food: "data/API_FP.CPI.TOTL.ZG_DS2_en_csv_v2_85166.csv",
  disaster:
    "data/economic-damages-from-natural-disasters-as-a-share-of-gdp.csv",
};

const variableLabels = {
  temperature: "Temperature Anomaly (°C)",
  wheat: "Wheat Yield (tons/hectare)",
  gdp: "GDP Growth (%)",
  food: "Consumer Price Inflation (%)",
  disaster: "Total Disaster Damage (% GDP)",
};

let datasets = {},
  yearRange = [2000, 2022];

function setupDropdowns() {
  xSel.innerHTML = ySel.innerHTML = "";
  Object.entries(variableLabels).forEach(([k, label]) => {
    const o1 = new Option(label, k);
    const o2 = new Option(label, k);
    xSel.add(o1);
    ySel.add(o2);
  });
  xSel.value = "temperature";
  ySel.value = "gdp";
}

function normalize(data) {
  const extent = d3.extent(data, (d) => d.value);
  const scale = d3.scaleLinear().domain(extent).range([0, 1]);
  return data.map((d) => ({ year: d.year, value: scale(d.value) }));
}

function drawChart(animate = false) {
  const selectedYear = +document.getElementById("yearSlider").value;

  const svg = d3.select("#chart").html("");
  const tooltip = d3.select("#tooltip").style("opacity", 0);
  const legend = d3.select("#legend").html("");

  const xKey = xSel.value,
    yKey = ySel.value;
  const xLabel = variableLabels[xKey],
    yLabel = variableLabels[yKey];

  const xData = normalize(datasets[xKey].filter((d) => d.year <= selectedYear));
  const yData = normalize(datasets[yKey].filter((d) => d.year <= selectedYear));

  const merged = xData
    .map((d) => {
      const match = yData.find((e) => e.year === d.year);
      return match ? { year: d.year, x: d.value, y: match.value } : null;
    })
    .filter(Boolean);

  merged.sort((a, b) => a.year - b.year);

  const margin = { top: 20, right: 60, bottom: 40, left: 60 },
    width = 800,
    height = 400,
    w = width - margin.left - margin.right,
    h = height - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  const x = d3
    .scaleLinear()
    .domain(d3.extent(merged, (d) => d.year))
    .range([0, w]);
  const y1 = d3.scaleLinear().domain([0, 1]).range([h, 0]);
  const y2 = d3.scaleLinear().domain([0, 1]).range([h, 0]);

  g.append("g")
    .attr("transform", `translate(0,${h})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));
  g.append("g").call(d3.axisLeft(y1));
  g.append("g").attr("transform", `translate(${w},0)`).call(d3.axisRight(y2));

  g.append("text")
    .attr("x", w / 2)
    .attr("y", h + 35)
    .attr("text-anchor", "middle")
    .text("Year");
  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -h / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text(`${xLabel} (Normalized)`);
  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -h / 2)
    .attr("y", w + 45)
    .attr("text-anchor", "middle")
    .text(`${yLabel} (Normalized)`);

  const line1 = d3
    .line()
    .curve(d3.curveMonotoneX)
    .x((d) => x(d.year))
    .y((d) => y1(d.x));

  const line2 = d3
    .line()
    .curve(d3.curveMonotoneX)
    .x((d) => x(d.year))
    .y((d) => y2(d.y));

  const path1 = g
    .append("path")
    .datum(merged)
    .attr("fill", "none")
    .attr("stroke", "#1c3d5a")
    .attr("stroke-width", 2)
    .attr("d", line1);

  const path2 = g
    .append("path")
    .datum(merged)
    .attr("fill", "none")
    .attr("stroke", "#e66101")
    .attr("stroke-width", 2)
    .attr("d", line2);

  if (animate) {
    const len1 = path1.node().getTotalLength();
    const len2 = path2.node().getTotalLength();
    path1
      .attr("stroke-dasharray", len1)
      .attr("stroke-dashoffset", len1)
      .transition()
      .duration(2000)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);
    path2
      .attr("stroke-dasharray", len2)
      .attr("stroke-dashoffset", len2)
      .transition()
      .duration(2000)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);
  }

  g.selectAll(".dot1")
    .data(merged)
    .enter()
    .append("circle")
    .attr("r", 3)
    .attr("fill", "#1c3d5a")
    .attr("cx", (d) => x(d.year))
    .attr("cy", (d) => y1(d.x))
    .on("mouseover", (e, d) =>
      tooltip
        .style("opacity", 1)
        .html(`${d.year}<br>${xLabel}: ${(d.x * 100).toFixed(1)}%`)
        .style("left", e.pageX + 10 + "px")
        .style("top", e.pageY - 28 + "px")
    )
    .on("mouseout", () => tooltip.style("opacity", 0));

  g.selectAll(".dot2")
    .data(merged)
    .enter()
    .append("circle")
    .attr("r", 3)
    .attr("fill", "#e66101")
    .attr("cx", (d) => x(d.year))
    .attr("cy", (d) => y2(d.y))
    .on("mouseover", (e, d) =>
      tooltip
        .style("opacity", 1)
        .html(`${d.year}<br>${yLabel}: ${(d.y * 100).toFixed(1)}%`)
        .style("left", e.pageX + 10 + "px")
        .style("top", e.pageY - 28 + "px")
    )
    .on("mouseout", () => tooltip.style("opacity", 0));

  legend
    .append("div")
    .html(
      `<span class="legend-swatch" style="background:#1c3d5a;"></span>${xLabel}`
    );
  legend
    .append("div")
    .html(
      `<span class="legend-swatch" style="background:#e66101;"></span>${yLabel}`
    );
}

function averageTemperature(data) {
  const grouped = d3.rollup(
    data.filter((d) => d.Code === countryCode && d.Day),
    (v) => d3.mean(v, (d) => +d["Temperature anomaly"]),
    (d) => +d.Day.slice(0, 4)
  );
  return Array.from(grouped, ([year, value]) => ({ year, value })).filter(
    (d) => d.year >= 2000 && isFinite(d.value)
  );
}

function parseWheatData(rows, countryName) {
  const result = rows
    .filter(
      (d) =>
        (d.Entity || "").trim().toLowerCase() === countryName &&
        isFinite(+d["Wheat yield"])
    )
    .map((d) => ({ year: +d.Year, value: +d["Wheat yield"] }))
    .filter((d) => d.year >= 2000 && isFinite(d.value));

  return result;
}

Promise.all([
  d3.json("data/countryNameToCode.json"),
  d3.csv(files.temperature),
  d3.csv(files.wheat),
  fetch(files.gdp)
    .then((r) => r.text())
    .then((t) => d3.csvParse(t.split("\n").slice(4).join("\n"))),
  fetch(files.food)
    .then((r) => r.text())
    .then((t) => d3.csvParse(t.split("\n").slice(4).join("\n"))),
  d3.csv(files.disaster),
]).then(([codeMap, tempRows, wheatRows, gdpRows, foodRows, disasterRows]) => {
  const codeToName = {};
  for (const [name, code] of Object.entries(codeMap)) {
    codeToName[code] = name;
  }

  const countryName = codeToName[countryCode]?.toLowerCase();
  datasets.wheat = parseWheatData(wheatRows, countryName);
  datasets.temperature = averageTemperature(tempRows);
  datasets.gdp = gdpRows
    .filter((d) => d["Country Code"] === countryCode)
    .flatMap((d) => {
      const vals = [];
      for (let y = 2001; y <= 2022; y++) {
        const prev = +d[y - 1],
          curr = +d[y];
        if (isFinite(prev) && isFinite(curr)) {
          vals.push({ year: y, value: ((curr - prev) / prev) * 100 });
        }
      }
      return vals;
    });

  datasets.food = foodRows
    .filter((d) => d["Country Code"] === countryCode)
    .flatMap((d) =>
      Object.keys(d)
        .filter((k) => k.match(/^\d{4}$/))
        .map((y) => ({ year: +y, value: +d[y] }))
    )
    .filter((d) => d.year >= 2000 && isFinite(d.value));

  const yearKey = Object.keys(disasterRows[0]).find(
    (k) => k.toLowerCase() === "year"
  );
  const codeKey = Object.keys(disasterRows[0]).find((k) =>
    k.toLowerCase().includes("code")
  );
  const valueKey = Object.keys(disasterRows[0]).find(
    (k) => k.toLowerCase().includes("damage") && k.toLowerCase().includes("gdp")
  );

  if (!yearKey || !codeKey || !valueKey) {
    console.error(
      "Missing expected columns. Found keys:",
      Object.keys(disasterRows[0])
    );
  } else {
    datasets.disaster = disasterRows
      .filter((d) => d[codeKey] === countryCode && isFinite(+d[valueKey]))
      .map((d) => ({
        year: +d[yearKey],
        value: +d[valueKey],
      }))
      .filter((d) => d.year >= 2000);
  }

  setupDropdowns();
  drawChart();
});

document.getElementById("playBtn").addEventListener("click", drawChart);
xSel.addEventListener("change", drawChart);
ySel.addEventListener("change", drawChart);
