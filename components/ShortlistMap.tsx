"use client";

import { useState } from "react";
import type { RankedListing } from "@/lib/domain";

const bounds = {
  north: 39.145,
  south: 39.1,
  east: -77.195,
  west: -77.245,
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function markerPosition(home: RankedListing) {
  const inset = 7;
  const x = inset + ((home.longitude - bounds.west) / (bounds.east - bounds.west)) * (100 - inset * 2);
  const y = inset + ((bounds.north - home.latitude) / (bounds.north - bounds.south)) * (100 - inset * 2);
  return { left: `${x}%`, top: `${y}%` };
}

export function ShortlistMap({ matches }: { matches: RankedListing[] }) {
  const [selectedId, setSelectedId] = useState(matches[0]?.id ?? "");
  const selected = matches.find((home) => home.id === selectedId) ?? matches[0];

  if (!selected) return null;

  return (
    <section className="map-card" aria-labelledby="map-title">
      <div className="map-heading">
        <div>
          <p className="card-kicker">Shortlist map</p>
          <h3 id="map-title">See where the matches sit</h3>
        </div>
        <span>Approximate demo locations</span>
      </div>

      <div className="map-canvas">
        <svg className="map-roads" viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true">
          <path className="major-road" d="M810 -20 C760 115 785 205 700 315 C640 390 610 445 590 550" />
          <path d="M-30 155 C180 195 320 125 520 175 C690 217 820 185 1030 110" />
          <path d="M40 430 C245 340 390 390 550 310 C720 225 820 270 1010 230" />
          <path d="M210 -20 C240 120 350 195 320 320 C300 405 350 470 420 550" />
          <path d="M80 40 C260 75 440 35 610 90 C750 135 865 85 1020 55" />
        </svg>
        <span className="map-label kentlands-label">Kentlands</span>
        <span className="map-label crown-label">Crown</span>
        <span className="map-label quince-label">Quince Orchard</span>
        <span className="road-label">I-270</span>

        {matches.map((home, index) => (
          <a
            className={`map-marker${home.id === selected.id ? " selected" : ""}`}
            href={`#match-${home.id}`}
            key={home.id}
            style={markerPosition(home)}
            onFocus={() => setSelectedId(home.id)}
            onMouseEnter={() => setSelectedId(home.id)}
            aria-label={`Rank ${index + 1}: ${home.address}, ${home.score} match score`}
          >
            <span>{index + 1}</span>
          </a>
        ))}

        <div className="map-selection" aria-live="polite">
          <span>#{matches.findIndex((home) => home.id === selected.id) + 1} · {selected.score} match</span>
          <strong>{selected.address}</strong>
          <small>{money.format(selected.price)} · {selected.bedrooms} beds</small>
        </div>
      </div>
    </section>
  );
}
