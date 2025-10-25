import React, { useEffect, useState } from "react";
import ReviewTableRow from "./ReviewTableRow";
import RoundSelector from "./RoundSelector";
import dummyDataRounds from "./Data/heatMapData.json";
import dummyData from "./Data/dummyData.json";
import axiosClient from "../../utils/axios_client";
import { calculateAverages, normalizeReviewDataArray, convertBackendRoundArray } from "./utils";
import { TeamMember } from "./App";
import "./grades.scss";
import { Link } from "react-router-dom";
import Statistics from "./Statistics";
import Filters from "./Filters";
import ShowReviews from "./ShowReviews"; //importing show reviews component
import dummyauthorfeedback from "./Data/authorFeedback.json"; // Importing dummy data for author feedback
import { useSelector } from "react-redux";
import { getAuthToken } from "../../utils/auth";
import jwtDecode from "jwt-decode";

const ReviewTable: React.FC = () => {
  const [currentRound, setCurrentRound] = useState<number>(-1);
  const [sortOrderRow, setSortOrderRow] = useState<"asc" | "desc" | "none">("none");
  const [showToggleQuestion, setShowToggleQuestion] = useState(false);
  // removed unused 'open' state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  // store rounds data fetched from backend (array of rounds)
  const [roundsData, setRoundsData] = useState<any[] | null>(null);
  const [assignmentId, setAssignmentId] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string>(dummyData.team || "");
  const [teamGrade, setTeamGrade] = useState<number | string>(dummyData.grade || "");
  const [teamComment, setTeamComment] = useState<string>(dummyData.comment || "");
  const [teamFetchError, setTeamFetchError] = useState<string | null>(null);
  const [lastParticipantsResp, setLastParticipantsResp] = useState<any>(null);
  const [lastTeamResp, setLastTeamResp] = useState<any>(null);
  const [showReviews, setShowReviews] = useState(false);
  const [ShowAuthorFeedback, setShowAuthorFeedback] = useState(false);
  const [roundSelected, setRoundSelected] = useState(-1);
  const authUser = useSelector((state: any) => state.authentication?.user);

  useEffect(() => {
    // Normalize members data to support both old (string array) and new (object array) formats
    const normalizedMembers = dummyData.members.map((member: any) => {
      if (typeof member === "string") {
        // Old format: just a string (name)
        return { name: member, username: "" };
      }
      // New format: object with name and username
      return member;
    });
    setTeamMembers(normalizedMembers);

    // The fetch is now handled by fetchBackend below. We still initialize team members here.
  }, []);

  // fetch backend data for the provided assignment id and convert it to frontend shape
  const fetchBackend = async (id: number) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      let res;
      try {
        res = await axiosClient.get(`/grades/${id}/view_our_scores`);
      } catch (e: any) {
        // If this endpoint returns 404 or permission denied, try view_all_scores as a fallback
        if (e?.response?.status === 404 || e?.response?.status === 403) {
          try {
            res = await axiosClient.get(`/grades/${id}/view_all_scores`);
            // if view_all_scores returns object with team_scores (instructor view), prefer that
            if (res && res.data && res.data.team_scores && Object.keys(res.data.team_scores).length > 0) {
              // pick the first team_scores entry (if the backend keyed by team or included assignment-level data)
              // team_scores may be a nested object similar to view_our_scores payload
              const maybe = res.data.team_scores;
              // If team_scores is directly the same shape as view_our_scores
              if (maybe.reviews_of_our_work) {
                res = { data: maybe };
              } else {
                // else try to extract first key's value
                const firstKey = Object.keys(maybe)[0];
                if (firstKey) {
                  res = { data: maybe[firstKey] };
                }
              }
            }
          } catch (e2: any) {
            // swallow inner fallback errors; will be handled below
            res = null;
          }
        } else {
          // rethrow other errors
          throw e;
        }
      }
      if (res && res.data && res.data.reviews_of_our_work) {
        const backendRoundsObj = res.data.reviews_of_our_work;
        const orderedRounds = Object.keys(backendRoundsObj)
          .sort()
          .map((k) => backendRoundsObj[k]);
        const converted = convertBackendRoundArray(orderedRounds);
        setRoundsData(converted);
        // after rounds are fetched, attempt to fetch team metadata for this assignment & current user
        try {
          const token = getAuthToken();
          if (!token || token === "EXPIRED") {
            setTeamFetchError("No valid auth token found — team name and members require login.\nPlease log in and try again.");
          } else {
            const userId = getCurrentUserId();
            if (!userId) {
              setTeamFetchError("Unable to determine current user from token. Team metadata cannot be loaded.");
            } else {
              setTeamFetchError(null);
              await fetchTeamMetadata(id, userId);
            }
          }
        } catch (err) {
          // non-fatal: keep rounds but don't block on team metadata
          console.warn("Failed to load team metadata:", err);
        }
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      setFetchError("No review data returned by backend.");
    } catch (err: any) {
      setIsLoading(false);
      const status = err?.response?.status;
      if (status === 404) {
        setFetchError("No review data found for this assignment (404). You may not be a participant for this assignment or the assignment does not exist.");
      } else if (status === 403) {
        setFetchError("You are not authorized to view reviews for this assignment (403). Try using a user with instructor privileges or check the assignment ID.");
      } else {
        setFetchError(err?.message || "Failed to fetch backend data");
      }
    }
  };

  // Helper: determine current user id from redux or token fallback
  const getCurrentUserId = (): number | null => {
    if (authUser && authUser.id) return authUser.id;
    const token = getAuthToken();
    if (!token) return null;
    try {
      const decoded: any = jwtDecode(token as string);
      return decoded?.id || decoded?.user_id || null;
    } catch (err) {
      return null;
    }
  };

  // Fetch participant -> team -> team participants -> user details
  const fetchTeamMetadata = async (assignmentIdParam: number, userId: number) => {
    try {
      // 1) get participants for the given user
      const participantsResp = await axiosClient.get(`/participants/user/${userId}`);
      setLastParticipantsResp(participantsResp?.data || participantsResp);
      const participants = participantsResp?.data || [];

      // find the participant for this assignment
      const myParticipant = participants.find((p: any) => {
        // many responses use parent_id for assignment id
        return Number(p.parent_id) === Number(assignmentIdParam) || Number(p.assignment_id) === Number(assignmentIdParam);
      });

      if (!myParticipant) {
        setTeamFetchError("You are not a participant in this assignment (no participant record found for the current user and assignment).\nIf you expect to be a participant, confirm the assignment ID and that you're logged in as the correct user.");
        return;
      }

      const teamId = myParticipant.team_id || myParticipant.team?.id;
      if (!teamId) {
        setTeamFetchError("Participant found but no team_id set on participant. Team metadata cannot be loaded.");
        return;
      }

      // 2) call teams_participants list_participants to get team and participants
      let teamResp;
      let teamObj;
      let teamParticipants: any[] = [];
      try {
        teamResp = await axiosClient.get(`/teams_participants/${teamId}/list_participants`);
        setLastTeamResp(teamResp?.data || teamResp);
        teamObj = teamResp?.data?.team;
        teamParticipants = teamResp?.data?.team_participants || [];
      } catch (e: any) {
        // If forbidden, attempt a fallback using assignment participants endpoint
        const status = e?.response?.status;
        setLastTeamResp(e?.response?.data || e?.response || e);
        if (status === 403) {
          setTeamFetchError("teams_participants endpoint returned 403 — attempting fallback using /participants/assignment/:assignment_id");
          try {
            const assignPartsResp = await axiosClient.get(`/participants/assignment/${assignmentIdParam}`);
            const assignParts = assignPartsResp?.data || [];
            // find participants with the same team_id
            const matching = assignParts.filter((p: any) => (p.team_id || (p.team && p.team.id)) === Number(teamId));
            // collect user ids
            const userIdsFromAssign = matching.map((p: any) => p.user_id || (p.participant && p.participant.user_id)).filter(Boolean);
            const uniqueUserIds2 = Array.from(new Set(userIdsFromAssign));
            const userFetches2 = uniqueUserIds2.map((uid) => axiosClient.get(`/users/${uid}`));
            const usersResp2 = await Promise.allSettled(userFetches2);
            const members2 = usersResp2
              .map((r) => (r.status === "fulfilled" ? r.value.data : null))
              .filter(Boolean)
              .map((u: any) => ({ name: u.full_name || u.fullName || u.name, username: u.name }));
            if (members2.length > 0) {
              setTeamMembers(members2);
              setTeamFetchError(null);
            } else {
              setTeamFetchError("Fallback succeeded but no user records found for team members.");
            }
          } catch (e2: any) {
            setTeamFetchError(`Fallback via participants/assignment failed: ${e2?.message || String(e2)}`);
          }
        } else {
          // non-403 error — propagate message
          setTeamFetchError(`Failed to fetch team participants: ${e?.message || String(e)}`);
        }
      }

      if (teamObj) {
        setTeamName(teamObj.name || teamObj.team_name || teamObj.display_name || teamName);
        setTeamGrade(teamObj.grade_for_submission ?? teamGrade);
        setTeamComment(teamObj.comment_for_submission ?? teamComment);
      }

      // 3) fetch user details for each team participant (map user_id -> user)
      const userIds: number[] = teamParticipants
        .map((tp: any) => tp.user_id || tp.userId || (tp.participant && tp.participant.user_id))
        .filter(Boolean);

      const uniqueUserIds = Array.from(new Set(userIds));

      const userFetches = uniqueUserIds.map((uid) => axiosClient.get(`/users/${uid}`));
      const usersResp = await Promise.allSettled(userFetches);

      const members = usersResp
        .map((r) => (r.status === "fulfilled" ? r.value.data : null))
        .filter(Boolean)
        .map((u: any) => ({ name: u.full_name || u.fullName || u.name, username: u.name }));

      if (members.length > 0) {
        setTeamMembers(members);
        setTeamFetchError(null);
      } else {
        setTeamFetchError("Team participants resolved but no user records could be fetched.");
      }
    } catch (err: any) {
      console.warn("Failed to fetch team metadata", err?.message || err);
      setTeamFetchError(`Failed to fetch team metadata: ${err?.message || String(err)}`);
    }
  };

  const toggleSortOrderRow = () => {
    setSortOrderRow((prevSortOrder) => {
      if (prevSortOrder === "asc") return "desc";
      if (prevSortOrder === "desc") return "none";
      return "asc";
    });
  };

  const toggleShowReviews = () => {
    setShowReviews((prev) => !prev);
  };

  const selectRound = (r: number) => {
    setRoundSelected((prev) => r);
  };

  // Function to toggle the visibility of ShowAuthorFeedback component
  const toggleAuthorFeedback = () => {
    setShowAuthorFeedback((prev) => !prev);
  };

  const handleRoundChange = (roundIndex: number) => {
    setCurrentRound(roundIndex);
  };

  const toggleShowQuestion = () => {
    setShowToggleQuestion(!showToggleQuestion);
  };

  const renderTable = (roundData: any, roundIndex: number) => {
    // Normalize data to handle both old (questionNumber/questionText) and new (itemNumber/itemText) field names
    const normalizedData = normalizeReviewDataArray(roundData);
    
    const { averagePeerReviewScore, columnAverages, sortedData } = calculateAverages(
      normalizedData,
      sortOrderRow
    );

    const roundsSource = roundsData || dummyDataRounds;

    return (
      <div key={roundIndex} className="table-container mb-6">
        <h4 className="text-xl font-semibold">
          Review (Round: {roundIndex + 1} of {roundsSource.length})
        </h4>
        <table className="tbl_heat">
          <thead>
            <tr className="bg-gray-200">
              <th className="py-2 px-4 text-center" style={{ width: "70px" }}>
                Item No.
              </th>
              {showToggleQuestion && (
                <th className="item-prompt-header" style={{ width: "150px" }}>
                  Item
                </th>
              )}
              {Array.from({ length: roundData[0].reviews.length }, (_, i) => (
                <th key={i} className="py-2 px-4 text-center" style={{ width: "70px" }}>{`Review ${
                  i + 1
                }`}</th>
              ))}
              <th className="py-2 px-4" style={{ width: "70px" }} onClick={toggleSortOrderRow}>
                Average
                {sortOrderRow === "none" && <span>▲▼</span>}
                {sortOrderRow === "asc" && <span> ▲</span>}
                {sortOrderRow === "desc" && <span> ▼</span>}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => (
                <ReviewTableRow key={index} row={row} showToggleQuestion={showToggleQuestion} />
              ))}
            <tr className="no-bg">
              <td className="py-2 px-4" style={{ width: "70px" }}>
                Avg
              </td>
              {showToggleQuestion && <td></td>}
              {columnAverages.map((avg, index) => (
                <td key={index} className="py-2 px-4 text-center">
                  {avg.toFixed(2)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        <br />
        <h5>
          Average peer review score:{" "}
          <span style={{ fontWeight: "normal" }}>{averagePeerReviewScore}</span>
        </h5>
        <br />
      </div>
    );
  };

  return (
    <div className="p-4">
    <h2 className="text-2xl font-bold mb-2">Summary Report: Program 2</h2>
  <h5 className="text-xl font-semibold mb-1">Team: {teamName || dummyData.team}</h5>
      <div className="mb-3">
        <label htmlFor="assignmentId" className="mr-2">
          Assignment ID:
        </label>
        <input
          id="assignmentId"
          type="number"
          value={assignmentId}
          onChange={(e) => setAssignmentId(Number(e.target.value))}
          className="border px-2 mr-2"
          style={{ width: 100 }}
        />
        <button
          onClick={() => fetchBackend(assignmentId)}
          className="btn btn-primary px-3"
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Load"}
        </button>
        {fetchError && <span style={{ color: "red", marginLeft: 12 }}>{fetchError}</span>}
      </div>
      <span className="ml-4">
        Team members:{" "}
        {teamMembers.map((member, index) => (
          <span key={index}>
            {member.name}{member.username && ` (${member.username})`}
            {index !== teamMembers.length - 1 && ", "}
          </span>
        ))}
      </span>
      {teamFetchError && (
        <div style={{ marginTop: 8, color: "orange" }}>
          <strong>Team metadata:</strong> {teamFetchError}
        </div>
      )}
      {/* Debug panel - visible to developer to understand responses */}
      <details style={{ marginTop: 8 }}>
        <summary>Debug: last fetch responses</summary>
        <div style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
          <div>
            <strong>Participants response:</strong>
            <pre>{JSON.stringify(lastParticipantsResp, null, 2)}</pre>
          </div>
          <div>
            <strong>Team response:</strong>
            <pre>{JSON.stringify(lastTeamResp, null, 2)}</pre>
          </div>
        </div>
      </details>
      <div className="mt-2">
        <h5>Submission Links</h5>
        <ul>
          <li>
            <a
              href="https://github.ncsu.edu/Program-2-Ruby-on-Rails/WolfEvents"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://github.ncsu.edu/Program-2-Ruby-on-Rails/WolfEvents
            </a>
          </li>
          <li>
            <a href="http://152.7.177.44:8080/" target="_blank" rel="noopener noreferrer">
              http://152.7.177.44:8080/
            </a>
          </li>
          <li>
            <a
              href="https://github.ncsu.edu/Program-2-Ruby-on-Rails/WolfEvents/raw/main/README.md"
              download="README.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              README.md
            </a>
          </li>
        </ul>
      </div>

  <Statistics roundsSource={roundsData} />

      <br />

      <RoundSelector currentRound={currentRound} handleRoundChange={handleRoundChange} />

      <div className="toggle-container">
        <input
          type="checkbox"
          id="toggleQuestion"
          name="toggleQuestion"
          checked={showToggleQuestion}
          onChange={toggleShowQuestion}
        />
        <label htmlFor="toggleQuestion"> &nbsp;{showToggleQuestion ? "Hide item prompts" : "Show item prompts"}</label>
      </div>

      {/* Conditionally render tables based on currentRound */}
      {currentRound === -1
        ? (roundsData || dummyDataRounds).map((roundData, index) => renderTable(roundData, index)) // Render a table for each round if "All Rounds" is selected
        : renderTable((roundsData || dummyDataRounds)[currentRound], currentRound)}

      <div>
        <Filters
          toggleShowReviews={toggleShowReviews}
          toggleAuthorFeedback={toggleAuthorFeedback}
          selectRound={selectRound}
        />
      </div>

      <div>
        {showReviews && (
          <div>
            <h2>Reviews</h2>
            <ShowReviews data={roundsData || dummyDataRounds} roundSelected={roundSelected} />
          </div>
        )}
        {ShowAuthorFeedback && (
          <div>
            <h2>Author Feedback</h2>
            <ShowReviews data={dummyauthorfeedback} roundSelected={roundSelected} />
          </div>
        )}
      </div>

      <p className="mt-4">
        <h3>Grade and comment for submission</h3>
        Grade: {teamGrade ?? dummyData.grade}
        <br />
        Comment: {teamComment ?? dummyData.comment}
        <br />
        Late Penalty: {dummyData.late_penalty}
        <br />
      </p>

      <Link to="/">Back</Link>
    </div>
  );
};

export default ReviewTable;
