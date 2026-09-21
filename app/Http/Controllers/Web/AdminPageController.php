<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class AdminPageController extends Controller
{
    public function dashboard(): Response
    {
        return Inertia::render('Admin/Dashboard');
    }

    public function live(): Response
    {
        return Inertia::render('Admin/Live');
    }

    public function matches(): Response
    {
        return Inertia::render('Admin/Matches');
    }

    public function matchShow(int $match): Response
    {
        return Inertia::render('Admin/MatchDetail', ['id' => $match]);
    }

    public function teams(): Response
    {
        return Inertia::render('Admin/Teams');
    }

    public function players(): Response
    {
        return Inertia::render('Admin/Players');
    }

    public function news(): Response
    {
        return Inertia::render('Admin/News');
    }

    public function bracket(): Response
    {
        return Inertia::render('Admin/Bracket');
    }

    public function settings(): Response
    {
        return Inertia::render('Admin/Settings');
    }

    public function users(): Response
    {
        return Inertia::render('Admin/Users');
    }
}
