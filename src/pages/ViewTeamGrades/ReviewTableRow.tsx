import React, { useState, useEffect } from "react";
import { getColorClass } from "./utils"; // Importing utility functions
import { ReviewData } from "./App"; // Importing the ReviewData interface from App

// Truncatable text component
const TruncatableText: React.FC<{ text: string; wordLimit?: number }> = ({ text, wordLimit = 10 }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle empty or undefined text
  if (!text || typeof text !== 'string') {
    console.log('TruncatableText: Empty or invalid text', text);
    return <span></span>;
  }

  const words = text.trim().split(/\s+/);
  const shouldTruncate = words.length > wordLimit;
  const displayText = isExpanded || !shouldTruncate
    ? text
    : words.slice(0, wordLimit).join(" ");

  console.log('TruncatableText:', { text: text.substring(0, 50), wordCount: words.length, wordLimit, shouldTruncate });

  return (
    <span>
      {displayText}
      {shouldTruncate && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
            console.log('Truncatable text clicked, isExpanded:', !isExpanded);
          }}
          style={{
            color: "#b00404",
            cursor: "pointer",
            fontWeight: "bold",
            marginLeft: "4px"
          }}
        >
          {isExpanded ? " [show less]" : "..."}
        </span>
      )}
    </span>
  );
};

// Props interface for ReviewTableRow component
interface ReviewTableRowProps {
  row: ReviewData; // Data for the row
  showToggleQuestion: boolean; // Flag to toggle the item column
  onReviewClick?: (reviewIndex: number) => void; // Add click handler
}

// Functional component ReviewTableRow
const ReviewTableRow: React.FC<ReviewTableRowProps> = ({ row, showToggleQuestion, onReviewClick }) => {
  return (
    <tr className={row.maxScore === 1 ? "no-bg" : ""}>
      {/* Item Number */}
      <td className="py-2 px-4 text-center" data-question="This is the weight.">
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
      {showToggleQuestion && (
        <td className="item-prompt-cell">
          <TruncatableText text={row.itemText} wordLimit={5} />
        </td>
      )}

      {/* Review Cells - Now clickable */}
      {row.reviews.map((review, idx) => (
        <td
          key={idx}
          className={`py-2 px-4 text-center ${getColorClass(review.score, row.maxScore)}`}
          data-question={review.comment}
          style={{ cursor: onReviewClick ? "pointer" : "default" }}
          onClick={() => onReviewClick && onReviewClick(idx)}
          title={onReviewClick ? "Click to view full review" : ""}
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