import { ReviewData } from './App';

// Helper function to normalize data from old format (questionNumber/questionText) to new format (itemNumber/itemText)
export const normalizeReviewData = (data: any): ReviewData => {
  return {
    itemNumber: data.itemNumber || data.questionNumber || '',
    itemText: data.itemText || data.questionText || '',
    reviews: data.reviews || [],
    RowAvg: data.RowAvg || 0,
    maxScore: data.maxScore || 5
  };
};

// Function to normalize an array of review data
export const normalizeReviewDataArray = (dataArray: any[]): ReviewData[] => {
  return dataArray.map(normalizeReviewData);
};

// Convert backend rounds array (array of arrays of answer objects) to frontend round format
export const convertBackendRoundArray = (backendRounds: any[][]): ReviewData[][] => {
  if (!Array.isArray(backendRounds)) return [];
  return backendRounds.map((backendRound) => {
    if (!Array.isArray(backendRound)) return [];
    return backendRound.map((answersArray: any[], idx: number) => {
      const reviews = (answersArray || []).map((ans: any) => ({
        name: ans.reviewer_name || '',
        score: typeof ans.answer === 'number' ? ans.answer : Number(ans.answer) || 0,
        comment: ans.comments || '',
      }));

      const sum = reviews.reduce((acc: number, r: any) => acc + (r.score || 0), 0);
      const rowAvg = reviews.length ? sum / reviews.length : 0;

      // Heuristic for maxScore: if all scores are 0/1 then treat as binary (maxScore=1), else default to 5
      const maxScore = reviews.every((r: any) => r.score === 0 || r.score === 1) ? 1 : 5;

      return {
        itemNumber: String(idx + 1),
        itemText: (answersArray && answersArray[0] && answersArray[0].txt) || '',
        reviews,
        RowAvg: rowAvg,
        maxScore,
      } as ReviewData;
    });
  });
};

// Function to get color class based on score and maxScore
export const getColorClass = (score: number, maxScore: number) => {
  let scoreColor = score;
 
  scoreColor = ((maxScore - scoreColor) / maxScore) * 100;
  if (scoreColor >= 80) return 'c1';
  else if (scoreColor >= 60 && scoreColor < 80) return 'c2';
  else if (scoreColor >= 40 && scoreColor < 60) return 'c3';
  else if (scoreColor >= 20 && scoreColor < 40) return 'c4';
  else if (scoreColor >= 0 && scoreColor < 20) return 'c5';
  else return 'cf';
};

// Function to calculate averages for rows and columns
export const calculateAverages = (
  currentRoundData: ReviewData[],
  sortOrderRow: 'asc' | 'desc' | 'none'
) => {
  let totalAvg = 0;
  let itemCount = 0;
  let totalMaxScore = 0;
  currentRoundData.forEach((row) => {
    const sum = row.reviews.reduce((acc, val) => acc + val.score, 0);
    row.RowAvg = sum / row.reviews.length;
    totalAvg = row.RowAvg + totalAvg;
    totalMaxScore = totalMaxScore + row.maxScore;
    itemCount++;
  });

  const averagePeerReviewScore =
    itemCount > 0
      ? (((totalAvg / totalMaxScore) * 100) > 0 ? ((totalAvg / totalMaxScore) * 100).toFixed(2) : '0.00')
      : '0.00';

  const columnAverages: number[] = Array.from({ length: currentRoundData[0].reviews.length }, () => 0);

  currentRoundData.forEach((row) => {
    row.reviews.forEach((val, index) => {
      columnAverages[index] += val.score;
    });
  });

  columnAverages.forEach((sum, index) => {
    columnAverages[index] = (sum / totalMaxScore) * 5;
  });

  let sortedData = [...currentRoundData];

  if (sortOrderRow === 'asc') {
    sortedData = currentRoundData.slice().sort((a, b) => a.RowAvg - b.RowAvg);
  } else if (sortOrderRow === 'desc') {
    sortedData = currentRoundData.slice().sort((a, b) => b.RowAvg - a.RowAvg);
  }

  return { averagePeerReviewScore, columnAverages, sortedData };
};
