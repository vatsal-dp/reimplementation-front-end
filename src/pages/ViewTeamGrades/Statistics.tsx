// Statistics.tsx
import React, { useState, useEffect } from "react";
import { calculateAverages, normalizeReviewDataArray } from "./utils";
import "./grades.scss";
import dummyDataRounds from "./Data/heatMapData.json"; // Importing dummy data for rounds
import dummyauthorfeedback from "./Data/authorFeedback.json"; // Importing dummy data for author feedback
import teammateData from "./Data/teammateData.json";

//props for statistics component
interface StatisticsProps {
  roundsSource?: any[] | null;
}

//statistics component
const Statistics: React.FC<StatisticsProps> = ({ roundsSource = null }) => {
  const [sortedData, setSortedData] = useState<any[]>([]);
  useEffect(() => {
    // Normalize data to handle both old and new field names
    const referenceRounds = roundsSource || dummyDataRounds;
    const normalizedData = normalizeReviewDataArray(referenceRounds[0]);
    const { averagePeerReviewScore, columnAverages, sortedData } = calculateAverages(
      normalizedData,
      "asc"
    );
    const rowAvgArray = sortedData.map((item) => item.RowAvg);
    console.log(rowAvgArray);
    setSortedData(sortedData.map((item) => item.RowAvg));
  }, []);

  const [statisticsVisible, setstatisticsVisible] = useState<boolean>(false);
  const toggleStatisticsVisibility = () => {
    setstatisticsVisible(!statisticsVisible);
  };
  const [showReviews, setShowReviews] = useState(false);
  const [ShowAuthorFeedback, setShowAuthorFeedback] = useState(false);

  const [roundSelected, setRoundSelected] = useState(-1);

  const selectRound = (r: number) => {
    setRoundSelected((prev) => r);
  };

  // Function to toggle the visibility of ShowReviews component
  const toggleShowReviews = () => {
    setShowReviews((prev) => !prev);
  };

  // Function to toggle the visibility of ShowAuthorFeedback component
  const toggleAuthorFeedback = () => {
    setShowAuthorFeedback((prev) => !prev);
  };

  const headerCellStyle: React.CSSProperties = {
    padding: "10px",
    textAlign: "center",
  };

  //calculation for total reviews recieved
  let totalReviewsForQuestion1: number = 0;
  const roundsSourceLocal = roundsSource || dummyDataRounds;
  roundsSourceLocal.forEach((round: any[]) => {
    round.forEach((question: any) => {
      const qNum = (question?.questionNumber ?? question?.itemNumber ?? "").toString();
      if (qNum === "1") {
        totalReviewsForQuestion1 += (question.reviews || []).length;
      }
    });
  });
  //calculation for total feedback recieved
  let totalfeedbackForQuestion1: number = 0;
  dummyauthorfeedback.forEach((round: any[]) => {
    round.forEach((question: any) => {
      const qNum = (question?.questionNumber ?? question?.itemNumber ?? "").toString();
      if (qNum === "1") {
        totalfeedbackForQuestion1 += (question.reviews || []).length;
      }
    });
  });

  const subHeaderCellStyle: React.CSSProperties = {
    padding: "10px",
    textAlign: "center",
  };

  return (
    <div className="table-container mb-6">
      <h5>Round Summary</h5>
      <table className="tbl_heat">
        <thead>
          <tr>
            <th>Round</th>
            <th>Submitted work (avg)</th>
            <th>Author feedback (avg)</th>
            <th>Teammate review (avg)</th>
          </tr>
        </thead>
        <tbody>
          {(roundsSource || dummyDataRounds).map((roundData, index) => {
            // Normalize data to handle both old and new field names
            const normalizedData = normalizeReviewDataArray(roundData);
            // Calculate averages for each category using data from utils or manually.
            const submittedWorkAvg = calculateAverages(normalizedData, "asc").averagePeerReviewScore;
            const authorFeedbackAvg =
              dummyauthorfeedback[index]?.reduce((acc, item) => {
                const questionScoreSum = item.reviews.reduce(
                  (sum, review) => sum + review.score,
                  0
                );
                return acc + questionScoreSum / item.reviews.length;
              }, 0) / dummyauthorfeedback[index].length;

            const teammateReviewAvg =
              teammateData[index]?.reviews.reduce((acc, review) => acc + review.score, 0) /
              teammateData[index]?.reviews.length;

            return (
              <tr key={index}>
                <td>Round {index + 1}</td>
                <td>{Number(submittedWorkAvg).toFixed(2)}</td>
                <td>{authorFeedbackAvg?.toFixed(2) || "N/A"}</td>
                <td>{teammateReviewAvg?.toFixed(2) || "N/A"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Statistics;
