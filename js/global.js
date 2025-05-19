const files = {
    temperature: "data/global/monthly-temperature-anomalies.csv",
    seaLevel: "data/global/sea-level_fig-1.csv",
    disasters: "data/global/number-of-natural-disaster-events.csv",
    food: "data/global/PFOODINDEXM.csv",
    wheat: "data/global/wheat-yield.csv",
    gdp: "data/global/global-gdp-over-the-long-run.csv"
};

let datasets = {}, yearRange = [2000, 2025];

function populateDropdowns() {
    const options = [
        { value: "temperature", label: "Temperature Rise (°C)" },
        { value: "seaLevel", label: "Sea Level Rise (inches)" },
        { value: "disasters", label: "Natural Disasters (events/year)" },
        { value: "gdp", label: "Global GDP Change (%)" },
        { value: "food", label: "Food Price Index" },
        { value: "wheat", label: "Wheat Yield (tons/hectare)" }
    ];
    const xSel = document.getElementById("x-select");
    const ySel = document.getElementById("y-select");
    xSel.innerHTML = ySel.innerHTML = "";
    options.forEach(opt => {
        const o1 = new Option(opt.label, opt.value);
        const o2 = new Option(opt.label, opt.value);
        xSel.add(o1);
        ySel.add(o2);
    });
    xSel.value = "temperature";
    ySel.value = "gdp";
}

function averageByYear(data) {
    const grouped = d3.rollup(
        data.filter(d => d.year >= 2000),
        v => d3.mean(v, d => d.value),
        d => d.year
    );
    return Array.from(grouped, ([year, value]) => ({ year, value }))
        .filter(d => !isNaN(d.year) && !isNaN(d.value));
}

async function loadData() {
    datasets.temperature = averageByYear((await d3.csv(files.temperature, d => {
        return { year: parseInt(d.Day?.slice(0, 4)), value: +d["Temperature anomaly"] };
    })).filter(d => d.year && isFinite(d.value)));

    const response = await fetch(files.seaLevel);
    const parsed = d3.csvParse((await response.text()).split('\n').slice(6).join('\n'));
    datasets.seaLevel = parsed.map(d => {
        return { year: +d["Year"], value: +d["CSIRO - Adjusted sea level (inches)"] };
    }).filter(d => d.year && isFinite(d.value));

    datasets.disasters = averageByYear((await d3.csv(files.disasters, d => {
        return { year: +d.Year, value: +d.Disasters };
    })).filter(d => d.year && isFinite(d.value)));

    datasets.food = averageByYear((await d3.csv(files.food, d => {
        return { year: parseInt(d.observation_date?.slice(0, 4)), value: +d.PFOODINDEXM };
    })).filter(d => d.year && isFinite(d.value)));

    datasets.wheat = averageByYear((await d3.csv(files.wheat, d => {
        return { year: +d.Year, value: +d["Wheat yield"] };
    })).filter(d => d.year && isFinite(d.value)));

    const rawGDP = (await d3.csv(files.gdp, d => ({ year: +d.Year, value: +d.GDP }))).filter(d => d.year && isFinite(d.value));
    datasets.gdp = [];
    for (let i = 1; i < rawGDP.length; i++) {
        const prev = rawGDP[i - 1], curr = rawGDP[i];
        if (curr.year >= 2000) {
            datasets.gdp.push({ year: curr.year, value: ((curr.value - prev.value) / prev.value) * 100 });
        }
    }

    populateDropdowns();
    createSlider();
    drawChart();
}

function normalize(values) {
    const extent = d3.extent(values, d => d.value);
    const scale = d3.scaleLinear().domain(extent).range([0, 1]);
    return values.map(d => ({ year: d.year, value: scale(d.value) }));
}

function createSlider() {
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = 2000;
    slider.max = 2025;
    slider.value = 2025;
    slider.id = "yearSlider";
    slider.style.marginTop = "1rem";
    document.getElementById("controls").appendChild(slider);
    slider.addEventListener("input", () => {
        yearRange[1] = +slider.value;
        drawChart();
    });
}

function drawChart(animate = false) {
    const svg = d3.select("#chart"), tooltip = d3.select("#tooltip"), legend = d3.select("#legend");
    svg.selectAll("*").remove();
    legend.selectAll("*").remove();

    const width = 800, height = 400;
    const margin = { top: 20, right: 60, bottom: 50, left: 60 },
        w = width - margin.left - margin.right,
        h = height - margin.top - margin.bottom;

    const xKey = document.getElementById("x-select").value;
    const yKey = document.getElementById("y-select").value;
    const xLabel = document.querySelector(`#x-select option:checked`).textContent;
    const yLabel = document.querySelector(`#y-select option:checked`).textContent;

    const dataX = normalize(datasets[xKey].filter(d => d.year >= yearRange[0] && d.year <= yearRange[1]));
    const dataY = normalize(datasets[yKey].filter(d => d.year >= yearRange[0] && d.year <= yearRange[1]));
    const merged = dataX.map(d => {
        const y = dataY.find(e => e.year === d.year);
        return y ? { year: d.year, x: d.value, y: y.value } : null;
    }).filter(Boolean);

    merged.sort((a, b) => a.year - b.year);


    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3.scaleLinear().domain(d3.extent(merged, d => d.year)).range([0, w]);
    const y1 = d3.scaleLinear().domain([0, 1]).range([h, 0]);
    const y2 = d3.scaleLinear().domain([0, 1]).range([h, 0]);

    g.append("g").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));
    g.append("g").call(d3.axisLeft(y1).ticks(5));
    g.append("g").attr("transform", `translate(${w},0)`).call(d3.axisRight(y2).ticks(5));

    const line1 = d3.line()
        .curve(d3.curveMonotoneX)      
        .x(d => x(d.year))
        .y(d => y1(d.x));

    const line2 = d3.line()
        .curve(d3.curveMonotoneX)
        .x(d => x(d.year))
        .y(d => y2(d.y));


    const path1 = g.append("path")
        .datum(merged)
        .attr("fill", "none")
        .attr("stroke", "#1c3d5a")
        .attr("stroke-width", 2)
        .attr("d", line1);

    const path2 = g.append("path")
        .datum(merged)
        .attr("fill", "none")
        .attr("stroke", "#e66101")
        .attr("stroke-width", 2)
        .attr("d", line2);

    if (animate) {
        const len1 = path1.node().getTotalLength();
        const len2 = path2.node().getTotalLength();
        path1.attr("stroke-dasharray", len1)
            .attr("stroke-dashoffset", len1)
            .transition().duration(2000).ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);
        path2.attr("stroke-dasharray", len2)
            .attr("stroke-dashoffset", len2)
            .transition().duration(2000).ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);
    }

    g.selectAll(".dot1").data(merged).enter().append("circle")
        .attr("cx", d => x(d.year)).attr("cy", d => y1(d.x)).attr("r", 3).attr("fill", "#1c3d5a")
        .on("mouseover", (e, d) => tooltip.style("opacity", 1).html(`${d.year}<br>${xLabel}: ${(d.x * 100).toFixed(1)}%`).style("left", `${e.pageX + 10}px`).style("top", `${e.pageY - 28}px`))
        .on("mouseout", () => tooltip.style("opacity", 0));

    g.selectAll(".dot2").data(merged).enter().append("circle")
        .attr("cx", d => x(d.year)).attr("cy", d => y2(d.y)).attr("r", 3).attr("fill", "#e66101")
        .on("mouseover", (e, d) => tooltip.style("opacity", 1).html(`${d.year}<br>${yLabel}: ${(d.y * 100).toFixed(1)}%`).style("left", `${e.pageX + 10}px`).style("top", `${e.pageY - 28}px`))
        .on("mouseout", () => tooltip.style("opacity", 0));

    legend.append("div").html(`<div class='legend-swatch' style='background:#1c3d5a'></div><span>${xLabel}</span>`);
    legend.append("div").html(`<div class='legend-swatch' style='background:#e66101'></div><span>${yLabel}</span>`);
}




d3.select("#playBtn").on("click", () => drawChart(true));
d3.select("#x-select").on("change", drawChart);
d3.select("#y-select").on("change", drawChart);
loadData();