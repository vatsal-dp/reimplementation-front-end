import React, { useState } from "react";
import { getColorClass } from "./utils";
import { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";

//props for the ShowReviews
interface ReviewComment {
  score: number;
  comment?: string;
  name: string;
}

interface Review {
  questionNumber: string;
  questionText: string;
  reviews: ReviewComment[];
  RowAvg: number;
  maxScore: number;
}

interface ShowReviewsProps {
  data: Review[][];
  roundSelected: number;
  targetReview?: {roundIndex: number, reviewIndex: number} | null;
  onReviewExpanded?: () => void;
}

// Collapsible Round Component
const CollapsibleRound: React.FC<{
  roundIndex: number;
  roundData: Review[];
  isStudent: boolean;
  expandAll: boolean;
  targetReview?: {roundIndex: number, reviewIndex: number} | null;
  onReviewExpanded?: () => void;
}> = ({ roundIndex, roundData, isStudent, expandAll, targetReview, onReviewExpanded }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Sync with expandAll prop
  React.useEffect(() => {
    setIsExpanded(expandAll);
  }, [expandAll]);

  // Auto-expand if this is the target round
  React.useEffect(() => {
    if (targetReview && targetReview.roundIndex === roundIndex) {
      setIsExpanded(true);
    }
  }, [targetReview, roundIndex]);

  const num_of_questions = roundData.length;
  const num_of_reviews = roundData[0]?.reviews.length || 0;

  return (
    <div style={{ marginBottom: "10px" }} ref={containerRef}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ 
          textAlign: "left",
          background: "#990000",
          border: "2px solid #990000",
          borderRadius: "0",
          cursor: "pointer",
          padding: "8px 16px",
          color: "white",
          fontWeight: "bold",
          fontSize: "14px",
          fontFamily: "Arial, sans-serif",
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}
      >
        <span style={{ fontSize: "10px" }}>{isExpanded ? "▼" : "▶"}</span>
        <span>Round {roundIndex + 1}({num_of_reviews} reviews, {num_of_questions} questions)</span>
      </button>

      {isExpanded && (
        <div style={{ padding: "10px 0", display: "table", width: "auto" }}>
          {Array.from({ length: num_of_reviews }, (_, i) => (
            <CollapsibleReview
              key={`round-${roundIndex}-review-${i}`}
              reviewIndex={i}
              roundData={roundData}
              isStudent={isStudent}
              expandAll={expandAll}
              targetReview={targetReview}
              roundIndex={roundIndex}
              onReviewExpanded={onReviewExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Collapsible Review Component
const CollapsibleReview: React.FC<{
  reviewIndex: number;
  roundData: Review[];
  isStudent: boolean;
  expandAll: boolean;
  targetReview?: {roundIndex: number, reviewIndex: number} | null;
  roundIndex: number;
  onReviewExpanded?: () => void;
}> = ({ reviewIndex, roundData, isStudent, expandAll, targetReview, roundIndex, onReviewExpanded }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Sync with expandAll prop
  React.useEffect(() => {
    setIsExpanded(expandAll);
  }, [expandAll]);

  // Auto-expand and scroll if this is the target review
  React.useEffect(() => {
    if (targetReview && 
        targetReview.roundIndex === roundIndex && 
        targetReview.reviewIndex === reviewIndex) {
      setIsExpanded(true);
      
      // Scroll to this review after a delay
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        // Call the callback to clear the target
        if (onReviewExpanded) {
          onReviewExpanded();
        }
      }, 300);
    }
  }, [targetReview, roundIndex, reviewIndex, onReviewExpanded]);

  return (
    <div style={{ marginBottom: "8px", marginLeft: "0" }} ref={contentRef}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ 
          textAlign: "left",
          background: "white",
          border: "2px solid #990000",
          borderRadius: "0",
          cursor: "pointer",
          padding: "8px 16px",
          color: "#990000",
          fontWeight: "bold",
          fontSize: "14px",
          fontFamily: "Arial, sans-serif",
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}
      >
        <span style={{ fontSize: "10px" }}>{isExpanded ? "▼" : "▶"}</span>
        <span>Review {reviewIndex + 1} ({roundData.length} questions)</span>
      </button>

      {isExpanded && (
        <div style={{ padding: "15px 20px", display: "inline-block", minWidth: "100%" }}>
          {roundData.map((question, j) => (
            <div key={`question-${j}-review-${reviewIndex}`} className="review-block" style={{ marginBottom: "15px", minWidth: "max-content" }}>
              <div className="question" style={{ fontWeight: "bold", marginBottom: "8px", fontSize: "14px", whiteSpace: "nowrap" }}>
                {j + 1}. {question.questionText}
              </div>
              <div className="score-container" style={{ marginLeft: "15px" }}>
                <span
                  className={`score ${getColorClass(
                    question.reviews[reviewIndex].score,
                    question.maxScore
                  )}`}
                >
                  {question.reviews[reviewIndex].score}
                </span>
                {question.reviews[reviewIndex].comment && (
                  <div className="comment" style={{ marginTop: "5px", fontSize: "14px", color: "#555", whiteSpace: "nowrap" }}>
                    {question.reviews[reviewIndex].comment}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

//function for ShowReviews
const ShowReviews: React.FC<ShowReviewsProps> = ({ data, roundSelected, targetReview, onReviewExpanded }) => {
  console.log("round selected: ", roundSelected);
  const rounds = data.length;
  const [expandAllReviews, setExpandAllReviews] = useState(false);

  const auth = useSelector(
    (state: RootState) => state.authentication,
    (prev, next) => prev.isAuthenticated === next.isAuthenticated
  );

  const isStudent = auth.user.role === "Student";

  // Render collapsible rounds
  const renderReviews = () => {
    const reviewElements: JSX.Element[] = [];

    for (let r = 0; r < rounds; r++) {
      // Filter based on roundSelected
      if (roundSelected === 1 && r === 1) {
        continue;
      }
      if (roundSelected === 2 && r === 0) {
        continue;
      }

      reviewElements.push(
        <CollapsibleRound
          key={`round-${r}`}
          roundIndex={r}
          roundData={data[r]}
          isStudent={isStudent}
          expandAll={expandAllReviews}
          targetReview={targetReview}
          onReviewExpanded={onReviewExpanded}
        />
      );
    }

    return reviewElements;
  };

  return (
    <div>
      {rounds > 0 ? (
        <>
          <div style={{ marginBottom: "15px" }}>
            <button
              onClick={() => setExpandAllReviews(!expandAllReviews)}
              style={{
                background: expandAllReviews ? "#990000" : "white",
                border: "2px solid #990000",
                borderRadius: "0",
                cursor: "pointer",
                padding: "8px 16px",
                color: expandAllReviews ? "white" : "#990000",
                fontWeight: "bold",
                fontSize: "14px",
                fontFamily: "Arial, sans-serif"
              }}
            >
              {expandAllReviews ? "Collapse All Reviews" : "Show All Reviews"}
            </button>
          </div>
          {renderReviews()}
        </>
      ) : (
        <div>No reviews available</div>
      )}
    </div>
  );
};

export default ShowReviews;