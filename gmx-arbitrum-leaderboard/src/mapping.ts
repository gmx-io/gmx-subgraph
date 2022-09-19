import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import {
    CompetitionCreated, CompetitionRemoved, CompetitionUpdated, JoinRequestApproved, TeamCreated
} from "../generated/Competition/Competition"

import {
    Account,
    AccountStat,
    Competition,
    Team
} from "../generated/schema"

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
    team.members.push(account.id)
    team.save()
}

function loadOrCreateCompetition(index: BigInt): Competition {
    let competition = Competition.load(index.toString())

    if (competition === null) {
        competition = new Competition(index.toString())
        competition.start = BigInt.fromI32(0);
        competition.end = BigInt.fromI32(0);
        competition.maxTeamSize = BigInt.fromI32(0);
        competition.canceled = false
        competition.save()
    }

    return <Competition>competition
}

function loadOrCreateAccount(address: Address): Account {
    let account = Account.load(address.toHex())

    if (account === null) {
        account = new Account(address.toHex())
        account.save()

        loadOrCreateAccountStat(account.id, null)
    }

    return <Account>account
}

function loadOrCreateTeam(competitionIndex: BigInt, leader: Address): Team {
    let id = competitionIndex.toString() + "-" + leader.toHex()
    let team = Team.load(id)

    if (team === null) {
        let account = loadOrCreateAccount(leader)
        team = new Team(id)
        team.competition = competitionIndex.toString()
        team.name = ""
        team.leader = account.id
        team.members = [account.id]
        team.pnlPercent = BigDecimal.fromString("0")
        team.pnl = BigDecimal.fromString("0")
        team.save()

        loadOrCreateAccountStat(account.id, id)
    }

    return <Team>team
}

function loadOrCreateAccountStat(account: string, team: string|null): AccountStat {
    let id = account
    if (team !== null) { id += "-" + team }

    let stats = AccountStat.load(id)

    if (stats === null) {
        stats = new AccountStat(id)
        stats.account = account
        stats.pnl = BigDecimal.fromString("0")
        stats.pnlPercent = BigDecimal.fromString("0")
        if (team !== null) {
            stats.team = team
        }
        stats.save()
    } 

    return <AccountStat>stats
}