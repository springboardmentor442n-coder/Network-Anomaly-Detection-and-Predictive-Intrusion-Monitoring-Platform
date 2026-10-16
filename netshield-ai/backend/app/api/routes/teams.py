"""Teams routes."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Team, User
from app.api.deps import require_admin, get_current_user

router = APIRouter()


class CreateTeamRequest(BaseModel):
    name: str
    description: Optional[str] = None


@router.get("/")
async def list_teams(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    teams = db.query(Team).all()
    return [{"id": t.id, "name": t.name, "description": t.description,
             "member_count": len(t.members), "created_at": t.created_at.isoformat()} for t in teams]


@router.post("/")
async def create_team(body: CreateTeamRequest, db: Session = Depends(get_db),
                      current_user: User = Depends(require_admin)):
    if db.query(Team).filter(Team.name == body.name).first():
        raise HTTPException(status_code=400, detail="Team name already exists")
    team = Team(name=body.name, description=body.description)
    db.add(team)
    db.commit()
    db.refresh(team)
    return {"id": team.id, "name": team.name, "description": team.description}


@router.delete("/{team_id}")
async def delete_team(team_id: str, db: Session = Depends(get_db),
                      current_user: User = Depends(require_admin)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    db.delete(team)
    db.commit()
    return {"message": "Team deleted"}
