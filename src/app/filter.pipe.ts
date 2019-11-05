import { Pipe, PipeTransform } from '@angular/core';
import { MediaType } from './data-types';

@Pipe({
	name: 'filter'
})
export class FilterPipe implements PipeTransform {
	transform(value: MediaType[], filterString: string) {
		filterString = filterString.trim();

		if (value !== undefined) {
			if (value.length < 0 || filterString === '' || filterString.length < 1)
				return value;

			filterString = filterString.toLowerCase();
			return value.filter(val => {
				return val.name.toLowerCase().includes(filterString);
			});
		}
	}
}
