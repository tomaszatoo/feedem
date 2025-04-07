import { Injectable } from '@angular/core';
// http client
import { HttpClient } from '@angular/common/http';
// rxjs
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HttpService {

  constructor(
    private readonly http: HttpClient 
  ) { }

  get(url: string): Observable<Object> {
    return this.http.get(url);
  }
}
