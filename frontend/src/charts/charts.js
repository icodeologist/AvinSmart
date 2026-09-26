export function salesPurchaseOptions() {
  return {
    series: [
      { name: "Sales", data: [44, 55, 57, 56, 61, 58, 63, 60, 66] },
      { name: "Purchase", data: [76, 85, 101, 98, 87, 105, 91, 114, 94] },
    ],
    colors: ["#60a5fa", "#f97316"],
    chart: { type: "bar", height: 320, width: "100%", parentHeightOffset: 0, toolbar: { show: false } },
    grid: { borderColor: "#e2e8f0" },
    legend: { fontFamily: "Poppins, sans-serif", fontWeight: 500, markers: { size: 5, shape: "square", offsetX: -2 } },
    plotOptions: { bar: { horizontal: false, columnWidth: "62%", borderRadius: 5, borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    stroke: { show: false },
    xaxis: { categories: ["28 Jan", "29 Jan", "30 Jan", "31 Jan", "1 Feb", "2 Feb", "3 Feb", "4 Feb", "5 Feb"], axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (value) => `${value}k` }, title: { text: "₹ (thousands)" } },
    tooltip: { y: { formatter: (value) => `₹ ${value} thousand` } },
  };
}
