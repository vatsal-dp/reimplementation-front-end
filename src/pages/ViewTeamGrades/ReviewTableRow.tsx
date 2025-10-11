import React, { useState, useEffect } from "react";
import { getColorClass } from "./utils"; // Importing utility functions
import { ReviewData } from "./App"; // Importing the ReviewData interface from App

// Props interface for ReviewTableRow component
interface ReviewTableRowProps {
  row: ReviewData; // Data for the row
  showToggleQuestion: boolean; // Flag to toggle the item column
}

// Functional component ReviewTableRow
const ReviewTableRow: React.FC<ReviewTableRowProps> = ({ row, showToggleQuestion }) => {
  return (
    <tr className={row.maxScore === 1 ? "no-bg" : ""}>
      {/* Item Number */}
      <td className="py-2 px-4 text-center" data-question={row.itemText}>
        <div className="circle-container">
          {row.maxScore !== 1 ? (
            <span className="circle">{row.maxScore}</span>
          ) : (
            <span className="tick">✓</span>
          )}
          {row.itemNumber}
        </div>
      </td>
      {/* Toggle Item */}
      {showToggleQuestion && <td className="item-prompt-cell">{row.itemText}</td>}

      {/* Review Cells */}
      {row.reviews.map((review, idx) => (
        <td
          key={idx}
          className={`py-2 px-4 text-center ${getColorClass(review.score, row.maxScore)}`}
          data-question={review.comment}
        >
          <span
            style={{ textDecoration: review.comment ? "underline" : "none", fontWeight: "bold" }}
          >
            {review.score}
          </span>
        </td>
      ))}

      {/* Row Average */}
      <td className="py-2 px-4 text-center">{row.RowAvg.toFixed(2)}</td>
    </tr>
  );
};

export default ReviewTableRow; // Exporting the ReviewTableRow component as default
