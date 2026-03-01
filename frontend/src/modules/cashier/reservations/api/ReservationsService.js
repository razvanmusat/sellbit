import { client } from '../../../../shared/api/client';

export class ReservationsService {
  
  /**
   * Obține rezervările pentru o anumită zi.
   * Endpoint: GET /api/playground/reservations?date=YYYY-MM-DD
   * @param {string} date - Data în format 'YYYY-MM-DD'
   */
  static async getByDay(date) {
    // Backend-ul așteaptă LocalDate (ISO format: YYYY-MM-DD)
    const response = await client(`playground/reservations?date=${date}`);
    return response;
  }

  /**
   * Crează o rezervare nouă.
   * Endpoint: POST /api/playground/reservations
   * @param {object} reservationData - Datele rezervării (startAt, endAt, parentName etc.)
   */
  static async create(reservationData) {
    return await client('playground/reservations', {
      method: 'POST',
      body: reservationData
    });
  }

  /**
   * Actualizează o rezervare existentă.
   * Endpoint: PUT /api/playground/reservations/{id}
   * @param {number} id 
   * @param {object} reservationData 
   */
  static async update(id, reservationData) {
    return await client(`playground/reservations/${id}`, {
      method: 'PUT',
      body: reservationData
    });
  }

  /**
   * Șterge (anulează) o rezervare.
   * Endpoint: DELETE /api/playground/reservations/{id}
   * @param {number} id 
   */
  static async delete(id) {
    return await client(`playground/reservations/${id}`, {
      method: 'DELETE'
    });
  }
  /**
   * Obține rezervările pentru un interval de timp.
   * Endpoint: GET /api/playground/reservations/interval?start=YYYY-MM-DDTHH:mm:ss&end=YYYY-MM-DDTHH:mm:ss
   * @param {string} start - Data de început (ISO)
   * @param {string} end - Data de sfârșit (ISO)
   */
  static async getByInterval(start, end) {
    return await client(`playground/reservations/interval?start=${start}&end=${end}`);
  }

  /**
   * Confirmă crearea invitației digitale (admin only).
   * Endpoint: PATCH /api/playground/reservations/{id}/confirm-digital-invitation
   * @param {number} id
   */
  static async confirmDigitalInvitation(id) {
    return await client(`playground/reservations/${id}/confirm-digital-invitation`, {
      method: 'PATCH'
    });
  }
}