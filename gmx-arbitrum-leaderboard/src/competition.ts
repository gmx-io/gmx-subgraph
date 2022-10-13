import {
    CompetitionCreated, CompetitionRemoved, CompetitionUpdated, JoinRequestApproved, MemberRemoved, TeamCreated
} from "../generated/Competition/Competition"
import { loadOrCreateAccount, loadOrCreateCompetition, loadOrCreateTeam } from "./utils";

export function handleCompetitionCreated(event: CompetitionCreated): void {
    let competition = loadOrCreateCompetition(event.params.index);
    competition.start = event.params.start;
    competition.end = event.params.end;
    competition.maxTeamSize = event.params.maxTeamSize;
    competition.save();
}

export function handleCompetitionUpdated(event: CompetitionUpdated): void {
    let competition = loadOrCreateCompetition(event.params.index)
    competition.start = event.params.start;
    competition.end = event.params.end;
    competition.maxTeamSize = event.params.maxTeamSize;
    competition.save()
}

export function handleCompetitionRemoved(event: CompetitionRemoved): void {
    let competition = loadOrCreateCompetition(event.params.index)
    competition.canceled = true;
    competition.save()
}

export function handleTeamCreated(event: TeamCreated): void {
    let team = loadOrCreateTeam(event.params.index, event.params.leader)
    team.name = event.params.name
    team.save()
}

export function handleJoinRequestApproved(event: JoinRequestApproved): void {
    let team = loadOrCreateTeam(event.params.index, event.params.leader)
    let account = loadOrCreateAccount(event.params.member)
    let members = team.members
    members.push(account.id)
    team.members = members
    team.save()
}

export function handleMemberRemoved(event: MemberRemoved): void {
    let team = loadOrCreateTeam(event.params.index, event.params.leader)
    let members = team.members
    let newMembers: string[] = []
    for (let i = 0; i < members.length; i++) {
        if (members[i] != event.params.member.toHex()) {
            newMembers.push(members[i])
        }
    }
    team.members = newMembers
    team.save()
}
